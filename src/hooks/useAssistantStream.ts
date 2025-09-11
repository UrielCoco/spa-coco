// src/hooks/useAssistantStream.ts
import { useCallback, useRef, useState } from "react";
import type { ChatMessage } from "@/services/assistant";
import { startStream } from "@/services/assistant";
import { mergeItinerary, extractLabels } from "@/services/parsers";
import { useItinerary } from "@/store/itinerary.store";

/** ======== DEBUG CONFIG ======== */
const DEBUG = true; // pon en false para silenciar
function safePreview(obj: any, max = 800) {
  try {
    if (obj == null) return obj;
    if (typeof obj === "string") return obj.length > max ? obj.slice(0, max) + "…(trim)" : obj;
    const str = JSON.stringify(obj);
    return str.length > max ? str.slice(0, max) + "…(trim)" : obj;
  } catch { return obj; }
}
const dlog = (...args: any[]) => { if (DEBUG) console.debug("[useAssistantStream]", ...args); };
const dlogEvt = (evt: string, payload: any) => { if (DEBUG) console.debug("[SSE evt]", evt, safePreview(payload)); };
/** ================================= */

const FALLBACK_TEXT = "Listo, actualicé el itinerario de la derecha. ✅";
const SHOW_FALLBACK_ONLY_IF_TOOL = true;

/** Extrae texto de cualquier payload posible (AI SDK / Responses / Assistants / custom) */
function pickText(payload: any): string {
  try {
    if (!payload) return "";

    if (typeof payload.value === "string") return payload.value;       // muchos backends usan { value }
    if (typeof payload.delta === "string") return payload.delta;       // OpenAI Responses/Assistants
    if (typeof payload.text === "string") return payload.text;
    if (typeof payload.textDelta === "string") return payload.textDelta; // Vercel AI SDK
    if (typeof payload.message === "string") return payload.message;

    // anidados frecuentes
    if (payload?.text && typeof payload.text.value === "string") return payload.text.value;
    if (payload?.delta && typeof payload.delta.value === "string") return payload.delta.value;

    if (Array.isArray(payload.content)) {
      for (const c of payload.content) {
        if (typeof c?.text === "string") return c.text;
        if (typeof c?.delta === "string") return c.delta;
        if (typeof c?.value === "string") return c.value;
      }
    }
    if (Array.isArray(payload.choices)) {
      const d = payload.choices[0]?.delta?.content;
      if (typeof d === "string") return d;
    }
    if (typeof payload === "string") return payload;
    return "";
  } catch {
    return "";
  }
}

/** Desenvuelve payload de tool a args simples */
function unwrapToolPayload(payload: any): any {
  let raw = payload;
  try { raw = typeof raw === "string" ? JSON.parse(raw) : raw; } catch {}
  if (!raw || typeof raw !== "object") return raw;

  if ("arguments" in raw) {
    const args = (raw as any).arguments;
    try { return typeof args === "string" ? JSON.parse(args) : args; } catch { return args; }
  }
  return raw; // { partial: {...} } o plano
}

/** Mapea nombres de evento a tipos internos */
function mapEvent(evt?: string) {
  const e = (evt || "").toLowerCase();

  if (e === "meta") return "meta";

  // Texto
  if (
    e === "delta" ||
    e === "token" ||
    e === "message" ||
    e.includes("text-delta") ||
    e.includes("message.delta") ||
    e.includes("response.output_text.delta") ||
    e.includes("response.delta")
  ) return "delta";

  // Tool-call (varios dialectos)
  if (
    e.includes("tool_call.arguments.delta") ||
    e.includes("function_call.arguments.delta") ||
    e.includes("tool_call.delta") ||
    e.includes("function_call.delta")
  ) return "tool-args-delta";

  if (
    e.includes("tool_call.completed") ||
    e.includes("function_call.completed") ||
    e.includes("requires_action")
  ) return "tool-args-complete";

  if (
    e === "tool" ||
    e.includes("tool.result") ||
    e.includes("tool_call.result")
  ) return "tool-result";

  // Final
  if (e === "final" || e === "done" || e.includes("completed") || e.includes("finish"))
    return "done";

  if (e.includes("error") || e === "error") return "error";

  return "unknown";
}

/** Busca llamadas a upsert_itinerary en un objeto arbitrario (ej. payload de 'final') */
function deepFindUpsertCalls(obj: any, acc: Array<{ name: string; args: any }> = []) {
  if (!obj || typeof obj !== "object") return acc;

  // Caso directo
  if (typeof obj.name === "string" && obj.name.includes("upsert_itinerary")) {
    const rawArgs = ("arguments" in obj) ? (obj as any).arguments : (obj as any).args;
    let args = rawArgs;
    try { args = typeof rawArgs === "string" ? JSON.parse(rawArgs) : rawArgs; } catch {}
    acc.push({ name: obj.name, args });
  }

  for (const k of Object.keys(obj)) {
    const v = (obj as any)[k];
    if (v && typeof v === "object") deepFindUpsertCalls(v, acc);
    if (Array.isArray(v)) v.forEach((it) => deepFindUpsertCalls(it, acc));
  }
  return acc;
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

  // Buffer de tool-calls por ID (cuando vienen como .arguments.delta)
  const toolBuffersRef = useRef<Record<string, { name?: string; buffer: string }>>({});

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
    if (receivedText) return;
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

  // Cuando recibimos un delta de argumentos de tool
  const onToolArgsDelta = useCallback((payload: any) => {
    try {
      const id = payload?.id || payload?.call_id || payload?.tool_call_id || "default";
      const name = payload?.name || payload?.tool?.name || payload?.function?.name;
      const delta =
        payload?.arguments?.delta ??
        payload?.delta ??
        payload?.value ??
        payload?.arguments ??
        "";

      if (!toolBuffersRef.current[id]) toolBuffersRef.current[id] = { name, buffer: "" };
      if (name && !toolBuffersRef.current[id].name) toolBuffersRef.current[id].name = name;
      if (typeof delta === "string" && delta) {
        toolBuffersRef.current[id].buffer += delta;
        dlog("tool-args-delta id:", id, "name:", name, "chunk:", JSON.stringify(delta).slice(0, 120));
      }
      flagsRef.current.receivedTool = true;
    } catch (e) {
      console.error("[tool-args-delta error]", e);
    }
  }, []);

  // Cuando el tool-call se completa (cerramos y ejecutamos)
  const onToolArgsComplete = useCallback((payload: any) => {
    try {
      const id = payload?.id || payload?.call_id || payload?.tool_call_id || "default";
      const buf = toolBuffersRef.current[id];
      const name =
        payload?.name ||
        payload?.tool?.name ||
        payload?.function?.name ||
        buf?.name ||
        "";

      let args: any = payload?.arguments ?? payload?.args;
      if (!args && buf?.buffer) args = buf.buffer;

      if (typeof args === "string") {
        try { args = JSON.parse(args); } catch {}
      }

      dlog("tool-args-complete id:", id, "name:", name, "args preview:", safePreview(args));
      if (name && name.includes("upsert_itinerary")) {
        handleTool({ name, arguments: args });
      }

      delete toolBuffersRef.current[id];
    } catch (e) {
      console.error("[tool-args-complete error]", e);
    }
  }, [handleTool]);

  // Última oportunidad: extrae tool-calls del payload final
  const tryToolsFromFinal = useCallback((payload: any) => {
    try {
      const calls = deepFindUpsertCalls(payload);
      if (calls.length) {
        dlog("final → found upsert_itinerary calls:", calls.length);
        flagsRef.current.receivedTool = true;
        for (const c of calls) handleTool({ name: c.name, arguments: c.args });
      } else {
        dlog("final → no upsert_itinerary calls found");
      }
    } catch (e) {
      console.error("[final parse tools error]", e);
    }
  }, [handleTool]);

  const send = useCallback(async (text: string) => {
    // reinicia flags/buffers por cada mensaje del usuario
    flagsRef.current = { receivedText: false, receivedTool: false, emittedFallback: false };
    toolBuffersRef.current = {};

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

          if (type === "tool-args-delta") {
            ensureAssistantPlaceholder(); // para poder mostrar fallback si al final no hay texto
            onToolArgsDelta(payload);
            return;
          }

          if (type === "tool-args-complete" || type === "tool-result") {
            ensureAssistantPlaceholder();
            onToolArgsComplete(payload);
            return;
          }

          if (type === "done") {
            // 1) Pega texto final si vino ahí
            const finalText = pickText(payload) || payload?.text || payload?.message || payload?.value || "";
            if (finalText && !flagsRef.current.receivedText) {
              ensureAssistantPlaceholder();
              appendAssistantText(finalText);
            }

            // 2) Si no vimos tool events, intenta extraerlos del payload final
            if (!flagsRef.current.receivedTool && payload && typeof payload === "object") {
              tryToolsFromFinal(payload);
            }

            setStreaming(false);
            abortRef.current = null;
            dlog("DONE ⏹ flags:", { ...flagsRef.current });
            maybeEmitFallback(); // solo si hubo tool y no hubo texto
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
            dlog("meta:", safePreview(payload));
            return;
          }

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
  }, [
    messages,
    ensureAssistantPlaceholder,
    appendAssistantText,
    onToolArgsDelta,
    onToolArgsComplete,
    tryToolsFromFinal,
    maybeEmitFallback,
  ]);

  const abort = () => {
    dlog("ABORT requested");
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  };

  return { messages, setMessages, send, abort, streaming } as const;
}
