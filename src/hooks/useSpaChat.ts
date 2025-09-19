// src/hooks/useSpaChat.ts
import { useCallback, useMemo, useRef, useState } from "react";
import type { ChatMessage } from "@/services/spa";
import { sendSpaChat } from "@/services/spa";

export type Bubble = {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: boolean;
  error?: string;
};

function uid() {
  return Math.random().toString(36).slice(2);
}

export function useSpaChat(initial?: ChatMessage[]) {
  const [bubbles, setBubbles] = useState<Bubble[]>(() =>
    (initial ?? []).map((m) => ({ id: uid(), role: m.role as any, content: m.content }))
  );
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const messages: ChatMessage[] = useMemo(
    () => bubbles.map((b) => ({ role: b.role, content: b.content })),
    [bubbles]
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setBubbles([]);
    setThinking(false);
    setError(null);
  }, []);

  const send = useCallback(
    async (text: string) => {
      const clean = text?.trim();
      if (!clean) return;

      // agrega user bubble
      setBubbles((prev) => [
        ...prev,
        { id: uid(), role: "user", content: clean },
        { id: uid(), role: "assistant", content: "Pensando…", thinking: true },
      ]);
      setThinking(true);
      setError(null);

      // llama API
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        const res = await sendSpaChat([...messages, { role: "user", content: clean }], {
          signal: abortRef.current.signal,
        });

        // reemplaza la burbuja "Pensando…" por la respuesta real
        setBubbles((prev) => {
          const copy = [...prev];
          const idx = copy.findIndex((b) => b.thinking);
          if (idx >= 0) {
            copy[idx] = {
              id: copy[idx].id,
              role: "assistant",
              content: res.message.content,
            };
          } else {
            copy.push({ id: uid(), role: "assistant", content: res.message.content });
          }
          return copy;
        });
      } catch (e) {
        const msg = (e as Error).message ?? "Error desconocido";
        setError(msg);
        // muestra error en la última burbuja del assistant
        setBubbles((prev) => {
          const copy = [...prev];
          const idx = copy.findIndex((b) => b.thinking);
          if (idx >= 0) {
            copy[idx] = {
              id: copy[idx].id,
              role: "assistant",
              content: "Ocurrió un error al contactar el backend.",
              error: msg,
            };
          } else {
            copy.push({
              id: uid(),
              role: "assistant",
              content: "Ocurrió un error al contactar el backend.",
              error: msg,
            });
          }
          return copy;
        });
        console.error("[useSpaChat] send error:", msg);
      } finally {
        setThinking(false);
        abortRef.current = null;
      }
    },
    [messages]
  );

  return { bubbles, thinking, error, send, reset };
}
