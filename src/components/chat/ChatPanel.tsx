import React, { useMemo, useRef, useState } from "react";
import { useAssistantStream, type Message as Msg } from "@/hooks/useAssistantStream";

export default function ChatPanel() {
  const { start } = useAssistantStream();

  // Arrancamos SIN mensaje inicial, como pediste
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const canSend = useMemo(() => input.trim().length > 0, [input]);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToEnd = () => {
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  };

  // ===== Callbacks que el hook usa para pintar el assistant =====
  const ensureAssistantPlaceholder = () => {
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    scrollToEnd();
  };

  const appendAssistantText = (chunk: string) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const lastIdx = next.length - 1;
      // Asegura que el último sea assistant; si no, crea uno
      if (next[lastIdx]?.role !== "assistant") {
        next.push({ role: "assistant", content: chunk });
      } else {
        next[lastIdx] = {
          ...next[lastIdx],
          content: (next[lastIdx].content || "") + chunk,
        };
      }
      return next;
    });
    scrollToEnd();
  };

  const finalizeAssistantMessage = (finalText: string) => {
    // Si el server no manda texto final (text: ""), dejamos el acumulado tal cual.
    if (!finalText) {
      scrollToEnd();
      return;
    }
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const lastIdx = next.length - 1;
      if (next[lastIdx]?.role === "assistant") {
        next[lastIdx] = { ...next[lastIdx], content: finalText };
      }
      return next;
    });
    scrollToEnd();
  };
  // =============================================================

  async function send() {
    const text = input.trim();
    if (!text) return;

    const nextMsgs: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(nextMsgs);
    setInput("");
    scrollToEnd();

    try {
      await start(
        { messages: nextMsgs },
        {
          // Lo importante: pasamos los callbacks
          ensureAssistantPlaceholder,
          appendAssistantText,
          finalizeAssistantMessage,
          // Si quieres ver logs extra en consola:
          onDebug: (d) => console.log("[ChatPanel debug]", d),
          onError: (e) => console.error("[ChatPanel error]", e),
        }
      );
    } catch (e) {
      console.error(e);
    } finally {
      inputRef.current?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send().catch(console.error);
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Lista de mensajes */}
      <div ref={listRef} className="flex-1 overflow-auto p-4 space-y-3">
        {messages.map((m, idx) => (
          <div
            key={`${m.role}-${idx}`}
            className={`max-w-[80%] rounded-2xl px-4 py-3 whitespace-pre-wrap ${
              m.role === "user"
                ? "ml-auto bg-black text-white"
                : "mr-auto bg-black/5 text-black"
            }`}
          >
            {m.content}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t p-3 flex gap-2">
        <input
          ref={inputRef}
          className="flex-1 border rounded-2xl px-3 h-11"
          placeholder="Escribe un mensaje…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          className="h-11 px-4 rounded-2xl bg-black text-white disabled:opacity-50"
          disabled={!canSend}
          onClick={() => send().catch(console.error)}
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
