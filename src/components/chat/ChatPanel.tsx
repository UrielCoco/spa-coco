import React, { useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function ChatPanel() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);

  const canSend = !pending && text.trim().length > 0;

  async function send() {
    const payload = text.trim();
    if (!payload) return;

    setMessages((m) => [...m, { role: "user", content: payload }]);
    setPending(true);

    try {
      const res = await fetch("/api/spa-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: payload }] }),
      });

      if (!res.ok) {
        const t = await res.text();
        console.error("spa-chat error", res.status, t);
        setMessages((m) => [
          ...m,
          { role: "assistant", content: "Hubo un problema al contactar al servidor." },
        ]);
      } else {
        const data = (await res.json()) as { assistantText?: string };
        if (data.assistantText?.trim()) {
          setMessages((m) => [...m, { role: "assistant", content: data.assistantText! }]);
        }
      }
    } catch (e) {
      console.error("spa-chat exception", e);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "No pude contactar al backend (/api/spa-chat)." },
      ]);
    } finally {
      setPending(false);
      setText(""); // limpia el input
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
            <div className="text-[10px] uppercase opacity-60 mb-1">{m.role}</div>
            <div className="whitespace-pre-wrap">{m.content}</div>
          </div>
        ))}
      </div>

      <div className="border-t p-2 flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe tu mensaje…"
          className="flex-1 border rounded p-2 text-sm h-16 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSend) send();
            }
          }}
        />
        <button
          type="button"
          className={`px-3 py-2 border rounded text-sm ${!canSend ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={send}
          disabled={!canSend}
        >
          {pending ? "Enviando…" : "Enviar"}
        </button>
      </div>
    </div>
  );
}
