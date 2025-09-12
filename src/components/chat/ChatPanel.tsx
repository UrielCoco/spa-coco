import React, { useMemo, useRef, useState } from "react";
import { useAssistantStream } from "@/hooks/useAssistantStream";

type Message = { role: "user" | "assistant" | "system"; content: string };

type Props = {
  onTool?: (json: any) => void;
};

export default function ChatPanel({ onTool }: Props) {
  const { start } = useAssistantStream(); // 👈 firma: start({ messages })
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "¡Hola! ¿En qué puedo ayudarte con tu viaje hoy?" },
  ]);

  const canSend = useMemo(() => input.trim().length > 0, [input]);
  const inputRef = useRef<HTMLInputElement>(null);

  async function send() {
    const text = input.trim();
    if (!text) return;
    const next: Message[] = [...messages, { role: "user", content: text }];

    setMessages(next);
    setInput("");

    // Sólo mandamos { messages }, sin 'streaming' ni 'send'
    await start({ messages: next });

    // Si quieres, vuelve a enfocar el input
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send().catch(console.error);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.map((m: Message, idx: number) => (
          <div
            key={`${m.role}-${idx}`}
            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              m.role === "user"
                ? "ml-auto bg-black text-white"
                : "mr-auto bg-black/5 text-black"
            }`}
          >
            {m.content}
          </div>
        ))}
      </div>

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
