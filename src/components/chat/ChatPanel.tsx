import React, { FormEvent, useRef, useState } from "react";
import { useSpaChat } from "@/hooks/useSpaChat";

export default function ChatPanel() {
  const { bubbles, thinking, error, send, reset } = useSpaChat();
  const [text, setText] = useState("");
  const formRef = useRef<HTMLFormElement | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setText("");
    await send(value);
    // re-enfocar para escribir rápido
    inputRef.current?.focus();
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="font-medium">Chat</div>
        <div className="flex items-center gap-2">
          {thinking ? (
            <span className="text-xs text-blue-600">Pensando…</span>
          ) : (
            <span className="text-xs text-neutral-500">Listo</span>
          )}
          <button
            className="rounded-md border px-2 py-1 text-xs hover:bg-neutral-50"
            onClick={reset}
            type="button"
            title="Reiniciar conversación"
          >
            Reiniciar
          </button>
        </div>
      </div>

      {/* Lista de mensajes */}
      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {bubbles.map((b) => (
          <div key={b.id} className="flex">
            <div
              className={
                b.role === "user"
                  ? "ml-auto max-w-[78%] rounded-2xl bg-blue-600 px-3 py-2 text-sm text-white"
                  : "mr-auto max-w-[78%] rounded-2xl bg-neutral-100 px-3 py-2 text-sm text-neutral-900"
              }
            >
              <div className="whitespace-pre-wrap">{b.content}</div>
              {b.thinking && (
                <div className="mt-1 text-[11px] text-blue-200">…</div>
              )}
              {b.error && (
                <div className="mt-2 rounded bg-red-50 p-2 text-[11px] text-red-700">
                  {b.error}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* indicador de escribiendo si no hay aún burbuja "pensando" */}
        {thinking && !bubbles.some((x) => x.thinking) && (
          <div className="mr-auto max-w-[78%] rounded-2xl bg-neutral-100 px-3 py-2 text-sm text-neutral-900">
            Pensando…
          </div>
        )}

        {/* error global (por si quieres verlo abajo también) */}
        {error && (
          <div className="mr-auto max-w-[78%] rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <form ref={formRef} onSubmit={onSubmit} className="border-t p-3">
        <div className="flex gap-2">
          <input
            ref={inputRef as any}
            className="h-10 flex-1 rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Escribe tu mensaje… (Ctrl/Cmd + Enter para enviar)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                formRef.current?.requestSubmit();
              }
            }}
          />
          <button
            type="submit"
            className="h-10 shrink-0 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            disabled={!text.trim()}
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
}
