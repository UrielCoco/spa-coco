import { useState, useRef, useCallback } from 'react';
import {
  sendSpaChat,
  type AssistantEvent,
  type ChatMessage,
  type Role,
} from '@/services/spa';

export type UseSpaChatOptions = {
  /**
   * Recibe TODOS los eventos crudos (assistant_say, upsert_itinerary, etc.)
   * para que el consumidor aplique parciales al store, registre métricas, etc.
   */
  onEvents?: (events: AssistantEvent[]) => void;
};

function makeMsg(role: Role, content: string): ChatMessage {
  // Tipamos explícitamente el mensaje para que 'role' no se ensanche a string
  return { role, content };
}

export function useSpaChat(opts: UseSpaChatOptions = {}) {
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const eventsRef = useRef<AssistantEvent[]>([]);

  const send = useCallback(
    async (text: string) => {
      const content = (text ?? '').trim();
      if (!content || busy) return;

      // 1) armamos el mensaje del usuario con tipado explícito
      const userMsg: ChatMessage = makeMsg('user', content);

      // 2) construimos el historial a enviar tipado como ChatMessage[]
      const nextMessages: ChatMessage[] = [...messages, userMsg];

      // 3) reflejamos en el estado local ANTES de llamar al backend
      setMessages(nextMessages);
      setBusy(true);

      try {
        const events = await sendSpaChat({ messages: nextMessages });

        // guardamos para acceso externo si hace falta
        eventsRef.current = events;

        // Proyectamos SOLO los mensajes "assistant" al historial legible
        const toAppend: ChatMessage[] = [];
        for (const ev of events) {
          if (ev.event === 'assistant') {
            toAppend.push(makeMsg('assistant', ev.payload.content));
          }
        }
        if (toAppend.length) {
          setMessages((cur) => [...cur, ...toAppend]);
        }

        // Permitimos que el consumidor aplique parciales al store del itinerario
        if (opts.onEvents) opts.onEvents(events);

        return events;
      } finally {
        setBusy(false);
      }
    },
    [busy, messages, opts],
  );

  const reset = useCallback(() => {
    setMessages([]);
    eventsRef.current = [];
  }, []);

  return {
    busy,
    messages,             // ChatMessage[]
    send,                 // (text: string) => Promise<AssistantEvent[] | void>
    lastEvents: eventsRef.current,
    reset,
  };
}

export type UseSpaChatReturn = ReturnType<typeof useSpaChat>;
export default useSpaChat;
