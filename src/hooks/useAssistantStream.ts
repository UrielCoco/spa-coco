// src/hooks/useAssistantStream.ts
import { useCallback, useRef, useState } from "react";
import type { ChatMessage } from "@/services/assistant";
import { startStream } from "@/services/assistant";
import { mergeItinerary, extractLabels } from "@/services/parsers";
import { useItinerary } from "@/store/itinerary.store";

/** ======== DEBUG CONFIG ======== */
const DEBUG = true; // 👈 ponlo en false para silenciar logs

function safePreview(obj: any, max = 800) {
  try {
    if (obj == null) return obj;
    if (typeof obj === "string") return obj.length > max ? obj.slice(0, max) + "…(trim)" : obj;
    const str = JSON.stringify(obj);
    return str.length > max ? str.slice(0, max) + "…(trim)" : obj;
  } catch {
    return obj;
  }
}
const dlog = (...args: any[]) => { if (DEBUG) console.debug("[useAssistantStream]", ...args); };
const dlogEvt = (evt: string, payload: any) => {
  if (!DEBUG) return;
  console.debug("[SSE evt]", evt, safePreview(payload));
};
/** ================================= */

/** Texto de fallback si hubo tool-call pero no hubo texto */
const FALLBACK_TEXT = "Listo, actualicé el itinerario de la derecha. ✅";
const SHOW_FALLBACK_ONLY_IF_TOOL = true;

/** Intenta extraer texto de cualquier payload posible (AI SDK / Responses / Assistants / Chat) */
function pickText(payload: any): string {
  try {
    if (!payload) return "";

    // OpenAI Responses/Assistants
    if (typeof payload.delta === "string") return payload.delta;
    if (typeof payload.text === "string") return payload.text;

    // Vercel AI SDK
    if (typeof payload.textDelta === "string") return payload.textDelta;

    // genéricos
    if (typeof payload.message === "string") return payload.message;

    // { content: [...] } variantes
    if (Array.isArray(payload.content)) {
      for (const c of payload.content) {
        if (c && typeof c.text === "string") return c.text;
        if (c && typeof c.delta === "string") return c.delta;
      }
    }

    // { choices: [{ delta: { content: "..." } }] }
    if (Array.isArray(payload.choices)) {
      const d = payload.choices[0]?.delta?.content;
      if (typeof d === "string") return d;
    }

    // fallback
    if (typeof payload === "string") return payload;
    return "";
  } catch {
    return "";
  }
}

/** Desenvuelve el payload de tool a un objeto args simple */
function unwrapToolPayload(payload: any): any {
  let raw = payload;
  try { raw = typeof raw === "string" ? JSON.parse(raw) : raw; } catch {}
  if (!raw || typeof raw !== "object") return raw;

  // { name, arguments } (OpenAI Tools)
  if ("arguments" in raw) {
    const args = (raw as any).arguments;
    try { return typeof args === "string" ? JSON.parse(args) : args; } catch { return args; }
  }
  // { partial: {...} } o plano
  return raw;
}

/** Normaliza nombres de eventos de distintos proveedores */
function mapEvent(evt?: string) {
  const e = (evt || "").toLowerCase();

  // Meta (threadId, etc.). OJO: no creamos burbuja aquí.
  if (e === "meta") return "meta";

  // Texto en streaming (varios dialectos)
  if (
    e === "delta" ||
    e === "token" ||
    e === "message" ||
    e.includes("text-delta") ||
    e.includes("message.delta") ||
    e.includes("response.output_text.delta") ||
    e.includes("response.delta")
  ) return "delta";

  // Herramientas
  if (
    e === "tool" ||
    e.includes("tool_call") ||
    e.includes("tool-call") ||
    e.includes("tool.result") ||
    e.includes("tool_call.result")
  ) return "tool";

  // Finalización
  if (e === "final" || e === "done" || e.includes("completed") || e.includes("finish"))
    return "done";

  // Errores
  if (e.includes("error") || e === "error") return "error";

  return "unknown";
}

export function useAssistantStream({ onTool }: { onTool?: (json: any) => void } = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Flags por ciclo de send()
  const flagsRef = useRef({
    receivedText: false,
    receivedTool: false,
    emittedFallback: false,
  });

  const ensureAssistantPlaceholder = useCallback(() => {
    setMessages((curr) => {
      const last = curr[curr.length - 1];
      if (!last || last.role !== "assistant") {
        dlog("ensurePlaceholder → creando burbuja assistant vacía");
        return [...curr, { role: "assistant", content: "" }];
      }
      return curr;
    });
  }, []);

  const appendAssistantText = useCallback((chunk: string) => {
    if (!chunk) return;
    flagsRef.current.receivedText = true;
    dlog("appendText:", JSON.stringify(chunk).slice(0, 120));
    setMessages((curr) => {
      const last = curr[curr.length - 1];
      if (!last || last.role !== "assistant") {
        return [...curr, { role: "assistant", content: chunk }];
      }
      return [...curr.slice(0, -1), { ...last, content: (last.content || "") + chunk }];
    });
  }, []);

  const maybeEmitFallback = useCallback(() => {
    const { receivedText, receivedTool, emittedFallback } = flagsRef.current;
    dlog("maybeEmitFallback flags:", { receivedText, receivedTool, emittedFallback });
    if (emittedFallback) return;
    if (receivedText) return; // ya hay texto real, no meter fallback
    if (SHOW_FALLBACK_ONLY_IF_TOOL && !receivedTool) return;

    setMessages((curr) => {
      const last = curr[curr.length - 1];
      flagsRef.current.emittedFallback = true;

      if (last && last.role === "assistant") {
        if (!last.content || last.content === FALLBACK_TEXT) {
          dlog("fallback → actualizando burbuja assistant con texto fallback");
          return [...curr.slice(0, -1), { ...last, content: FALLBACK_TEXT }];
        }
      }
      dlog("fallback → agregando nueva burbuja assistant");
      return [...curr, { role: "assistant", content: FALLBACK_TEXT }];
    });
  }, []);

  const handleTool = useCallback((payload: any) => {
    try {
      flagsRef.current.receivedTool = true;

      const args = unwrapToolPayload(payload) ?? {};
      const partial =
        args && typeof args === "object" && "partial" in args ? (args as any).partial : args;

      dlog("tool-call → args preview:", safePreview(partial));
      mergeItinerary(partial);

      const labels = extractLabels(partial);
      if (labels) {
        dlog("tool-call → labels:", labels);
        useItinerary.getState().mergeItinerary({ labels });
      }

      onTool?.(partial);
    } catch (e) {
      console.error("[tool parse error]", e);
    }
  }, [onTool]);

  const send = useCallback(async (text: string) => {
    // reinicia flags por cada mensaje del usuario
    flagsRef.current = { receivedText: false, receivedTool: false, emittedFallback: false };

    dlog("SEND ▶ user:", JSON.stringify(text));
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await startStream(next, {
        signal: controller.signal,
        onEvent: (evt: string, payload: any) => {
          dlogEvt(evt, payload);
          const type = mapEvent(evt);
          dlog("mapped type:", type);

          if (type === "delta") {
            ensureAssistantPlaceholder();
            const piece = pickText(payload);
            if (piece) appendAssistantText(piece);
            return;
          }

          if (type === "tool") {
            ensureAssistantPlaceholder(); // para poder poner fallback si no hay texto
            handleTool(payload);
            return;
          }

          if (type === "done") {
            setStreaming(false);
            abortRef.current = null;
            dlog("DONE ⏹ flags:", { ...flagsRef.current });
            maybeEmitFallback(); // solo si no hubo texto; respeta flags
            return;
          }

          if (type === "error") {
            console.error("[stream error]", payload);
            setStreaming(false);
            abortRef.current = null;
            dlog("ERROR ⏹ flags:", { ...flagsRef.current });
            maybeEmitFallback();
            return;
          }

          if (type === "meta") {
            // meta (threadId, etc.) → sin cambios visuales
            dlog("meta:", safePreview(payload));
            return;
          }

          // Diagnóstico: evento no mapeado
          console.debug("[stream unknown evt]", evt, safePreview(payload));
        },
        onError: (err: any) => {
          console.error("[stream fatal]", err);
          setStreaming(false);
          abortRef.current = null;
          dlog("FATAL ⏹ flags:", { ...flagsRef.current });
          maybeEmitFallback();
        },
      });
    } catch (e) {
      console.error("[startStream exception]", e);
      setStreaming(false);
      abortRef.current = null;
      dlog("EXCEPTION ⏹ flags:", { ...flagsRef.current });
      maybeEmitFallback();
    }
  }, [messages, ensureAssistantPlaceholder, appendAssistantText, handleTool, maybeEmitFallback]);

  const abort = () => {
    dlog("ABORT requested");
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  };

  return { messages, setMessages, send, abort, streaming } as const;
}
