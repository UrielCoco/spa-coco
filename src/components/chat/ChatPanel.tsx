import React, { useCallback, useMemo, useRef, useState } from 'react';
import { sendSpaChat, ChatMessage } from '@/services/spa';
import { useItinerary } from '@/store/itinerary.store';

type ChatEvent = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  at: number;
};

export default function ChatPanel() {
  const applyPartial = useItinerary((s) => s.applyPartial);
  const [events, setEvents] = useState<ChatEvent[]>([]);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [sending, setSending] = useState(false);

  const messagesForRequest = useMemo<ChatMessage[]>(() => {
    return events.map((e) => ({ role: e.role, content: e.content }));
  }, [events]);

  const pushEvent = useCallback((role: ChatEvent['role'], content: string) => {
    setEvents((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, role, content, at: Date.now() },
    ]);
  }, []);

  const onSend = useCallback(async () => {
    if (sending) return;
    const text = (inputRef.current?.value ?? '').trim();
    if (!text) return;

    pushEvent('user', text);
    if (inputRef.current) inputRef.current.value = '';

    setSending(true);
    try {
      // ---- Llama a tu endpoint SPA (puedes cambiar sendSpaChat después) ----
      const responseText = await sendSpaChat({
        messages: [...messagesForRequest, { role: 'user', content: text }],
      });

      // Estrategia simple:
      // 1) Si la respuesta contiene un bloque JSON de itinerario parcial => aplícalo
      // 2) Siempre guardamos el texto completo como evento del assistant
      let applied = false;
      try {
        // Heurística: intenta encontrar el primer bloque {...} grande
        const firstBrace = responseText.indexOf('{');
        const lastBrace = responseText.lastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace) {
          const candidate = responseText.slice(firstBrace, lastBrace + 1);
          const parsed = JSON.parse(candidate);
          // Si luce a parcial del estado, lo aplicamos
          if (parsed && typeof parsed === 'object') {
            applyPartial(parsed as any);
            applied = true;
          }
        }
      } catch {
        // si no es JSON válido, lo ignoramos
      }

      pushEvent(
        'assistant',
        applied
          ? `${responseText}\n\n[Itinerario actualizado con bloque JSON detectado]`
          : responseText,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      pushEvent('assistant', `No pude contactar al backend (/api/spa-chat). ${msg}`);
    } finally {
      setSending(false);
    }
  }, [sending, messagesForRequest, pushEvent, applyPartial]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto space-y-2 pr-2">
        {events.map((ev) => (
          <div
            key={ev.id}
            className={`rounded-md border p-2 text-sm ${
              ev.role === 'user'
                ? 'border-sky-600/30 bg-sky-900/10'
                : ev.role === 'assistant'
                ? 'border-emerald-600/30 bg-emerald-900/10'
                : 'border-zinc-600/30 bg-zinc-900/10'
            }`}
          >
            <div className="mb-1 text-xs opacity-70">
              {ev.role.toUpperCase()} • {new Date(ev.at).toLocaleTimeString()}
            </div>
            <pre className="whitespace-pre-wrap break-words">{ev.content}</pre>
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-2">
        <textarea
          ref={inputRef}
          className="min-h-[60px] flex-1 resize-y rounded-md border border-zinc-600/40 bg-transparent p-2 text-sm outline-none"
          placeholder="Escribe tu mensaje…  (⌘/Ctrl + Enter para enviar)"
          onKeyDown={onKeyDown}
        />
        <button
          onClick={onSend}
          disabled={sending}
          className="h-[60px] rounded-md bg-blue-600 px-4 text-white disabled:opacity-50"
        >
          {sending ? 'Enviando…' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}
