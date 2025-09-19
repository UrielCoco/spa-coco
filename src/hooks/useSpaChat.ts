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

/** Merge profundo, preservando arrays por reemplazo (no concat). */
function deepMerge<T>(target: T, src: any): T {
  if (src === null || src === undefined) return target;
  if (Array.isArray(src)) {
    // reemplazo de arrays
    return src as unknown as T;
  }
  if (typeof src !== "object") {
    return src as T;
  }
  if (typeof target !== "object" || target === null) {
    return { ...(src as object) } as T;
  }
  const out: any = Array.isArray(target) ? [...target] : { ...(target as any) };
  for (const k of Object.keys(src)) {
    const v = (src as any)[k];
    out[k] = deepMerge(out[k], v);
  }
  return out as T;
}

/** Aplica un parcial al store, sea cual sea la forma del store. */
function applyPartialToStore(partial: Record<string, any>) {
  const api: any = useItineraryStore as any;

  // 1) Si tu store definió acciones específicas, úsalas
  const st = api.getState?.();
  const upsertPartial = st?.upsertPartial ?? st?.upsert ?? st?.mergeItinerary ?? st?.merge;

  if (typeof upsertPartial === "function") {
    try {
      upsertPartial(partial);
      return;
    } catch {
      // Si falla, caemos al plan B
    }
  }

  // 2) Plan B: merge profundo directo sobre el estado (vía setState de Zustand)
  const current = api.getState?.();
  if (!current || typeof api.setState !== "function") return;

  const next = deepMerge(current, partial);
  api.setState(next, false, "assistant.upsertPartial");
}

export function useSpaChat() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesRef = useRef<{ role: "user" | "assistant"; content: string }[]>([]);

  const pushBubble = useCallback((b: Bubble) => {
    setBubbles((prev) => [...prev, b]);
  }, []);

  const reset = useCallback(() => {
    setBubbles([]);
    setThinking(false);
    setError(null);
    messagesRef.current = [];
  }, []);

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
        const res = await fetch("/api/spa-chat", {
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
      } catch (e: any) {
        setThinking(false);
        setError(e?.message || "Fallo desconocido");
        return { ok: false, error: e?.message || "Fallo desconocido" };
      }
    },
    [pushBubble]
  );

  return useMemo(
    () => ({
      bubbles,
      thinking,
      error,
      send,
      reset,
    }),
    [bubbles, thinking, error, send, reset]
  );
}
