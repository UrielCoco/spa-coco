import { useCallback, useRef, useState } from "react";
import type { ChatMessage } from "@/services/assistant";
import { startStream } from "@/services/assistant";
import { mergeItinerary, extractLabels } from "@/services/parsers";
import { useItinerary } from "@/store/itinerary.store";

/** Intenta extraer texto de cualquier payload posible */
function pickText(payload: any): string {
  try {
    if (!payload) return "";

    // Respuestas OpenAI Responses/Assistants
    // - response.output_text.delta => { delta: "..." }
    if (typeof payload.delta === "string") return payload.delta;
    if (typeof payload.text === "string") return payload.text;

    // AI SDK (text-delta) suele mandar { textDelta: "..." } o { content: [{type:'text-delta', text:'...'}] }
    if (typeof payload.textDelta === "string") return payload.textDelta;

    // {message:"..." }
    if (typeof payload.message === "string") return payload.message;

    // { content: [...] } (varios sabores)
    if (Array.isArray(payload.content)) {
      // Busca algo con { text }
      for (const c of payload.content) {
        if (c && typeof c.text === "string") return c.text;
        if (c && typeof c.delta === "string") return c.delta;
      }
    }

    // { choices: [{ delta: { content: "..."}}] } (estilo OpenAI chat)
    if (Array.isArray(payload.choices)) {
      const d = payload.choices[0]?.delta?.content;
      if (typeof d === "string") return d;
    }

    // fallback plano
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

  // { name, arguments } de OpenAI Tools
  if ("arguments" in raw) {
    const args = (raw as any).arguments;
    try { return typeof args === "string" ? JSON.parse(args) : args; } catch { return args; }
  }
  // { partial: {...} } compat
  return raw;
}

/** Normaliza nombres de eventos de múltiples proveedores */
function mapEvent(evt: string | undefined) {
  const e = (evt || "").toLowerCase();

  // Texto en streaming
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
  if (
    e === "final" ||
    e === "done" ||
    e.includes("completed") ||
    e.includes("finish")
  ) return "done";

  // Errores
  if (e.includes("error") || e === "error") return "error";

  return "unknown";
}

export function useAssistantStream({ onTool }: { onTool?: (json: any) => void } = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const appendAssistantText = useCallback((chunk: string) => {
    if (!chunk) return;
    setMessages((curr) => {
      const last = curr[curr.length - 1];
      if (!last || last.role !== "assistant") {
        return [...curr, { role: "assistant", content: chunk }];
      }
      return [...curr.slice(0, -1), { ...last, content: last.content + chunk }];
    });
  }, []);

  const handleTool = useCallback((payload: any) => {
    try {
      const args = unwrapToolPayload(payload) ?? {};
      const partial = (args && typeof args === "object" && "partial" in args) ? (args as any).partial : args;
      mergeItinerary(partial);
      const labels = extractLabels(partial);
      if (labels) useItinerary.getState().mergeItinerary({ labels });
      onTool?.(partial);
    } catch (e) {
      console.error("[tool parse error]", e);
    }
  }, [onTool]);

  const send = useCallback(async (text: string) => {
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await startStream(next, {
        signal: controller.signal,
        onEvent: (evt: string, payload: any) => {
          const type = mapEvent(evt);

          if (type === "delta") {
            const piece = pickText(payload);
            if (piece) appendAssistantText(piece);
            return;
          }
          if (type === "tool") {
            handleTool(payload);
            return;
          }
          if (type === "done") {
            setStreaming(false);
            abortRef.current = null;
            return;
          }
          if (type === "error") {
            console.error("[stream error]", payload);
            setStreaming(false);
            abortRef.current = null;
            return;
          }

          // Log de diagnóstico para eventos no mapeados
          console.debug("[stream unknown evt]", evt, payload);
        },
        onError: (err: any) => {
          console.error("[stream fatal]", err);
          setStreaming(false);
          abortRef.current = null;
        },
      });
    } catch (e) {
      console.error("[startStream exception]", e);
      setStreaming(false);
      abortRef.current = null;
    }
  }, [messages, appendAssistantText, handleTool]);

  const abort = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  };

  return { messages, setMessages, send, abort, streaming } as const;
}
