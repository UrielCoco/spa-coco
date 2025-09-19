/* src/hooks/useSpaChat.ts */
import { useCallback, useMemo, useRef, useState } from "react";
import type { ChatMessage } from "@/services/spa";
import { sendSpaChat } from "@/services/spa";

// Intentamos acoplar al store actual sin romper si cambia el nombre del método
let applyPartialItinerary: (p: any) => void = () => {};
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const store = require("@/store/itinerary.store");
  const s = store?.useItineraryStore?.getState?.() ?? store?.useItineraryStore?.();
  applyPartialItinerary =
    s?.applyPartial ??
    s?.upsertFromPartial ??
    s?.merge ??
    ((p: any) => {
      (globalThis as any).__lastItineraryPartial = p;
    });
} catch {
  // sin store (dev), ignoramos
}

export function useSpaChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [input, setInput] = useState("");
  const bufferRef = useRef<string>("");

  const canSend = useMemo(() => !streaming && input.trim().length > 0, [streaming, input]);

  const send = useCallback(async () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setStreaming(true);
    bufferRef.current = "";

    await sendSpaChat({ messages: [...messages, userMsg] }, (ev) => {
      if (ev.type === "assistant") {
        bufferRef.current += ev.delta;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            const copy = prev.slice(0, -1);
            copy.push({ role: "assistant", content: bufferRef.current });
            return copy;
          }
          return [...prev, { role: "assistant", content: bufferRef.current }];
        });
      } else if (ev.type === "assistant_done") {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            const copy = prev.slice(0, -1);
            copy.push({ role: "assistant", content: ev.content });
            return copy;
          }
          return [...prev, { role: "assistant", content: ev.content }];
        });
      } else if (ev.type === "itinerary") {
        try {
          applyPartialItinerary(ev.partial);
        } catch (e) {
          console.warn("[useSpaChat] no pude aplicar partial al store", e);
        }
      } else if (ev.type === "error") {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: `⚠️ Error: ${ev.message}` },
        ]);
      } else if (ev.type === "done") {
        setStreaming(false);
      }
    });
  }, [input, messages]);

  return {
    messages,
    input,
    setInput,
    canSend,
    send,
    streaming,
  };
}
