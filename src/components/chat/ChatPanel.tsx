// src/components/chat/ChatPanel.tsx
import React, { useEffect, useRef, useState } from "react";
import { useSpaChat } from "@/hooks/useSpaChat";

function TypingDots() {
  return (
    <span className="inline-flex gap-1 ml-1 align-middle">
      <span className="w-1.5 h-1.5 bg-current/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="w-1.5 h-1.5 bg-current/60 rounded-full animate-bounce" style={{ animationDelay: "120ms" }} />
      <span className="w-1.5 h-1.5 bg-current/60 rounded-full animate-bounce" style={{ animationDelay: "240ms" }} />
    </span>
  );
}

export default function ChatPanel() {
  // Si quieres fijar un system prompt global, pásalo aquí:
  const { bubbles, busy, send } = useSpaChat({ system: undefined });

  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // Autoscroll cuando llegan mensajes o mientras está pensando
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [bubbles, busy]);

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    await send(text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleSend();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="flex h-full w-full flex-col">
      {/* Lista de mensajes */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {bubbles.map((b) => {
          const isUser = b.role === "user";
          const bubbleColor = isUser ? "bg-blue-600 text-white" : "bg-neutral-200 text-neutral-900";
          return (
            <div key={b.id} className={`w-full flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] whitespace-pre-wrap rounded-2xl px-3 py-2 shadow-sm ${bubbleColor}`}>
                <div className={`text-[10px] uppercase mb-1 ${isUser ? "text-white/80" : "text-neutral-500"}`}>
                  {isUser ? "Tú" : "Assistant"}
                </div>
                <div className="text-sm leading-relaxed">{b.content}</div>
              </div>
            </div>
          );
        })}

        {/* Indicador de typing cuando el assistant está procesando */}
        {busy && (
          <div className="w-full flex justify-start">
            <div className="max-w-[78%] whitespace-pre-wrap rounded-2xl px-3 py-2 shadow-sm bg-neutral-200 text-neutral-900">
              <div className="text-[10px] uppercase mb-1 text-neutral-500">
                Assistant <TypingDots />
              </div>
              <div className="text-sm leading-relaxed">Pensando…</div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-neutral-200 p-2">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu mensaje…  (Ctrl/Cmd + Enter para enviar)"
            className="flex-1 resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px] max-h-[160px]"
          />
          <button
            onClick={handleSend}
            disabled={busy || !input.trim()}
            className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition"
            title={busy ? "El assistant está respondiendo…" : "Enviar"}
          >
            Enviar
          </button>
        </div>
        <div className="mt-1 text-[11px] text-neutral-500">Enter para enviar · Shift+Enter para salto de línea</div>
      </div>
    </div>
  );
}
