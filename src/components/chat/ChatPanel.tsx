// src/components/chat/ChatPanel.tsx
import React, { useMemo, useRef, useState } from 'react';
import { sendSpaChat, type AssistantEvent, type ChatMessage } from '@/services/spa';
import { useItineraryStore } from '@/store/itinerary.store';

type Bubble = { id: string; role: 'user' | 'assistant' | 'system'; text: string };

export default function ChatPanel() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');

  const applyPartial = useItineraryStore((s) => s.applyPartial);
  const lastMessagesRef = useRef<ChatMessage[]>([]);

  const messagesForApi: ChatMessage[] = useMemo(() => {
    return bubbles.map<ChatMessage>((b) => ({ role: b.role, content: b.text }));
  }, [bubbles]);

  async function handleSend() {
    const text = input.trim();
    if (!text || busy) return;

    setBubbles((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', text },
    ]);
    setInput('');
    setBusy(true);

    try {
      const userMsg: ChatMessage = { role: 'user', content: text };
      const payload = { messages: [...messagesForApi, userMsg] };

      const events: AssistantEvent[] = await sendSpaChat(payload);

      // Recorremos eventos (assistant + itinerary)
      for (const ev of events) {
        if (ev.event === 'assistant') {
          setBubbles((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: 'assistant', text: ev.payload.content },
          ]);
        }
        if (ev.event === 'itinerary') {
          try {
            applyPartial(ev.payload.partial);
            // Además, metemos un “log” visible del evento (útil depuración)
            setBubbles((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: 'assistant',
                text: `data:\n${JSON.stringify(ev, null, 2)}`,
              },
            ]);
          } catch (e: any) {
            setBubbles((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: 'assistant',
                text: `No se pudo aplicar parcial de itinerario: ${e?.message || e}`,
              },
            ]);
          }
        }
      }

      lastMessagesRef.current = payload.messages;
    } catch (err: any) {
      setBubbles((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: `No pude contactar /api/spa-chat: ${err?.message || String(err)}`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {bubbles.map((b) => (
          <div
            key={b.id}
            className={`rounded p-2 text-sm whitespace-pre-wrap ${
              b.role === 'user'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-800/70 text-slate-100'
            }`}
          >
            <div className="text-[10px] opacity-70 mb-1 uppercase">{b.role}</div>
            <div>{b.text}</div>
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-2">
        <input
          className="flex-1 rounded bg-slate-900 border border-slate-700 px-2 py-2 text-sm outline-none"
          placeholder="Escribe tu mensaje…  (⇧/Ctrl + Enter para enviar)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey)) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          onClick={handleSend}
          disabled={busy}
          className="px-3 py-2 text-sm rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
