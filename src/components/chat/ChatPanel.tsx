import React, { useMemo, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function ChatPanel() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const canSend = useMemo(
    () => !pending && (inputRef.current?.value?.trim()?.length ?? 0) > 0,
    [pending]
  );

  async function send() {
    const text = inputRef.current?.value?.trim();
    if (!text) return;

    // pinta el mensaje del usuario en la UI
    setMessages((m) => [...m, { role: "user", content: text }]);
    setPending(true);

    try {
      const res = await fetch("/api/spa-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: text }],
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        console.error("spa-chat error", res.status, t);
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content:
              "Lo siento, hubo un problema al procesar el mensaje. Revisa los logs del server.",
          },
        ]);
        return;
      }

      const data = (await res.json()) as {
        assistantText?: string;
      };

      // pinta la respuesta del assistant si vino texto
      if (data.assistantText && data.assistantText.trim().length > 0) {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.assistantText! },
        ]);
      }
    } catch (err) {
      console.error("spa-chat exception", err);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "No pude contactar al backend. ¿Estás en Vercel/localhost con /api/spa-chat activo?",
        },
      ]);
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="text-xs text-gray-400 px-3 py-2">USER / ASSISTANT</div>
      <div className="flex-1 overflow-auto px-3 pb-3 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "bg-white border rounded p-2 text-sm"
                : "bg-slate-50 border rounded p-2 text-sm"
            }
          >
            <div className="text-[10px] uppercase opacity-60 mb-1">
              {m.role}
            </div>
            <div className="whitespace-pre-wrap">{m.content}</div>
          </div>
        ))}
      </div>

      <div className="border-t p-2 flex gap-2">
        <textarea
          ref={inputRef}
          placeholder="Escribe tu mensaje…"
          className="flex-1 border rounded p-2 text-sm h-16 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.metaKey) send();
          }}
        />
        <button
          className="px-3 py-2 border rounded text-sm"
          onClick={send}
          disabled={!canSend}
          title="⌘ + Enter"
        >
          {pending ? "Enviando…" : "Enviar"}
        </button>
      </div>
    </div>
  );
}
