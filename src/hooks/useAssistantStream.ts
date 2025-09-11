// src/hooks/useAssistantStream.ts
import { useCallback, useRef, useState } from "react";
import type { ChatMessage } from "@/services/assistant";
import { startStream } from "@/services/assistant";
import { mergeItinerary, extractLabels } from "@/services/parsers";
import { useItinerary } from "@/store/itinerary.store";

/** Intenta extraer texto de cualquier payload posible (AI SDK / Responses / Assistants / Chat) */
function pickText(payload: any): string {
  try {
    if (!payload) return "";

    // Respuestas tipo Responses/Assistants (OpenAI)
    if (typeof payload.delta === "string") return payload.delta;
    if (typeof payload.text === "string") return payload.text;

    // AI SDK (text-delta)
    if (typeof payload.textDelta === "string") return payload.textDelta;

    // genéricos
    if (typeof payload.message === "string") return payload.message;

    // { content: [...] }
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
  try {
    raw = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    /* ignore */
  }
  if (!raw || typeof raw !== "object") return raw;

  // { name, arguments } (OpenAI Tools)
  if ("arguments" in raw) {
    const args = (raw as any).arguments;
    try {
      return typeof args === "string" ? JSON.parse(args) : args;
    } catch {
      return args;
    }
  }

  // { partial: {...} } o plano
  return raw;
}

/** Normaliza nombres de eventos provenientes de distintos proveedores */
function mapEvent(evt?: string) {
  const e = (evt || "").toLowerCase();

  // Meta (threadId, etc.)
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
  )
    return "delta";

  // Herramientas
  if (
    e === "tool" ||
    e.includes("tool_call") ||
    e.includes("tool-call") ||
    e.includes("tool.result") ||
    e.includes("tool_call.result")
  )
    return "tool";

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

  const ensureAssistantPlaceholder = useCallback(() => {
    setMessages((curr) => {
      const last = curr[curr.length - 1];
      if (!last || last.role !== "assistant") {
        return [...curr, { role: "assistant", content: "" }];
      }
      return curr;
    });
  }, []);

  const appendAssistantText = useCallback((chunk: string) => {
    if (!chunk) return;
    setMessages((curr) => {
      const last = curr[curr.length - 1];
      if (!last || last.role !== "assistant") {
        return [...curr, { role: "assistant", content: chunk }];
      }
      return [...curr.slice(0, -1), { ...last, content: (last.content || "") + chunk }];
    });
  }, []);

  const finalizeIfEmpty = useCallback(() => {
    setMessages((curr) => {
      const last = curr[curr.length - 1];
      if (!last || last.role !== "assistant" || (last.content ?? "") !== "") {
        return curr;
      }
      // Si no hubo texto (solo tools/meta), deja un mensaje útil.
      return [
        ...curr.slice(0, -1),
        { ...last, content: "Listo, actualicé el itinerario de la derecha. ✅" },
      ];
    });
  }, []);

  const handleTool = useCallback(
    (payload: any) => {
      try {
        const args = unwrapToolPayload(payload) ?? {};
        const partial =
          args && typeof args === "object" && "partial" in args ? (args as any).partial : args;

        mergeItinerary(partial);

        const labels = extractLabels(partial);
        if (labels) useItinerary.getState().mergeItinerary({ labels });

        onTool?.(partial);
      } catch (e) {
        console.error("[tool parse error]", e);
      }
    },
    [onTool]
  );

  const send = useCallback(
    async (text: string) => {
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

            if (type === "meta") {
              // asegura el placeholder mientras llegan deltas o tools
              ensureAssistantPlaceholder();
              return;
            }

            if (type === "delta") {
              ensureAssistantPlaceholder();
              const piece = pickText(payload);
              if (piece) appendAssistantText(piece);
              return;
            }

            if (type === "tool") {
              handleTool(payload);
              // mantenemos el placeholder por si luego llega texto
              ensureAssistantPlaceholder();
              return;
            }

            if (type === "done") {
              setStreaming(false);
              abortRef.current = null;
              finalizeIfEmpty();
              return;
            }

            if (type === "error") {
              console.error("[stream error]", payload);
              setStreaming(false);
              abortRef.current = null;
              finalizeIfEmpty();
              return;
            }

            // Diagnóstico: ve qué te está mandando el backend
            console.debug("[stream unknown evt]", evt, payload);
          },
          onError: (err: any) => {
            console.error("[stream fatal]", err);
            setStreaming(false);
            abortRef.current = null;
            finalizeIfEmpty();
          },
        });
      } catch (e) {
        console.error("[startStream exception]", e);
        setStreaming(false);
        abortRef.current = null;
        finalizeIfEmpty();
      }
    },
    [messages, ensureAssistantPlaceholder, appendAssistantText, handleTool, finalizeIfEmpty]
  );

  const abort = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  };

  return { messages, setMessages, send, abort, streaming } as const;
}
