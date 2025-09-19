import React, { useState } from "react";
import { useChat } from "@/store/chat.store";

/**
 * Panel de chat que mantiene la conversación (izquierda).
 * NO toca el panel del medio (ItineraryJsonView).
 * Si ya tienes lógica para llamar a la API, invócala en handleSend.
 */
export default function ChatPanel() {
  const messages = useChat((s) => s.messages);
  const add = useChat((s) => s.add);
  const [text, setText] = useState("");

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // 1) añadimos el mensaje del usuario
    add({ role: "user", content: trimmed });
    setText("");

    // 2) (opcional) aquí invocas tu backend/assistant
    // const assistantReply = await callAssistant(trimmed);
    // add({ role: "assistant", content: assistantReply });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto px-3 py-2">
        {messages.length === 0 && (
          <div className="text-sm text-muted-foreground">(Aquí podrás listar los mensajes...)</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className="mb-2">
            <div className="text-xs font-semibold uppercase text-slate-500">{m.role}</div>
            <div className="whitespace-pre-wrap text-sm">{m.content}</div>
          </div>
        ))}
      </div>

      <div className="border-t p-2 flex gap-2">
        <input
          className="flex-1 rounded border px-3 py-2 text-sm"
          placeholder="Escribe tu mensaje…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => (e.key === "Enter" && !e.shiftKey ? handleSend() : undefined)}
        />
        <button className="rounded bg-black px-3 py-2 text-white text-sm" onClick={handleSend}>
          Enviar
        </button>
      </div>
    </div>
  );
}
