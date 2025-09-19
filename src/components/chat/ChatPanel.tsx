/* src/components/chat/ChatPanel.tsx */
import React, { FormEvent } from "react";
import { useSpaChat } from "@/hooks/useSpaChat";

export default function ChatPanel() {
  const { messages, input, setInput, canSend, send, streaming } = useSpaChat();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (canSend) void send();
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex-1 overflow-auto rounded border p-2 text-sm bg-[--panel]">
        {messages.length === 0 ? (
          <div className="opacity-60">Aquí aparecerá la conversación…</div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className="mb-2">
              <div className="font-semibold uppercase text-xs opacity-60">
                {m.role}
              </div>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu mensaje…"
          className="flex-1 rounded border px-3 py-2 text-sm"
          disabled={streaming}
        />
        <button
          type="submit"
          disabled={!canSend}
          className="rounded bg-black text-white px-3 py-2 text-sm disabled:opacity-50"
        >
          {streaming ? "Generando…" : "Enviar"}
        </button>
      </form>
    </div>
  );
}
