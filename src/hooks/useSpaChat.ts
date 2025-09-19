import { useCallback, useMemo, useRef, useState } from "react";
import { inspectAssistantText, logInspect } from "@/services/assistant-inspector";
import { useItineraryStore } from "@/store/itinerary.store";

export type Bubble = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type SendResult =
  | { ok: true; assistantText: string }
  | { ok: false; error: string };

function uid() {
  return Math.random().toString(36).slice(2);
}

export function useSpaChat() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesRef = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const applyPartialToStore = useItineraryStore((s) => s.applyPartial);

  const pushBubble = useCallback((b: Bubble) => {
    setBubbles((prev) => [...prev, b]);
  }, []);

  const reset = useCallback(() => {
    setBubbles([]);
    setThinking(false);
    setError(null);
    messagesRef.current = [];
  }, []);

  // 👇 BASE=/api y componemos /spa-chat (match con tu proxy y prod)
  const BASE = (import.meta.env.VITE_ASSISTANT_BASE_URL as string) || "/api";
  const ENDPOINT = `${BASE.replace(/\/$/, "")}/spa-chat`;

  const send = useCallback(
    async (text: string): Promise<SendResult> => {
      const trimmed = text.trim();
      if (!trimmed) return { ok: false, error: "Mensaje vacío" };

      // burbuja user
      pushBubble({ id: uid(), role: "user", content: trimmed });
      messagesRef.current.push({ role: "user", content: trimmed });

      setThinking(true);
      setError(null);

      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: messagesRef.current }),
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} – ${txt || res.statusText}`);
        }

        const data = (await res.json()) as { assistantText?: string; text?: string };
        const assistantText = data.assistantText ?? data.text ?? "";

        // burbuja assistant
        pushBubble({ id: uid(), role: "assistant", content: assistantText });
        messagesRef.current.push({ role: "assistant", content: assistantText });

        // inspección y upsert parcial
        const inspected = inspectAssistantText(assistantText);
        logInspect("[assistant]", inspected);

        if (inspected.kind === "itinerary-partial") {
          applyPartialToStore(inspected.partial);
        }

        setThinking(false);
        return { ok: true, assistantText };
      } catch (err: any) {
        setThinking(false);
        setError(err?.message || "Error desconocido");
        return { ok: false, error: err?.message || "Error" };
      }
    },
    [pushBubble]
  );

  return useMemo(
    () => ({ bubbles, thinking, error, send, reset }),
    [bubbles, thinking, error, send, reset]
  );
}
