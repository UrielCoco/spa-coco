// src/hooks/useSpaChat.ts
import { useCallback, useMemo, useRef, useState } from 'react';
import { sendSpaChat, type ChatMessage, type SendSpaChatRequest } from '@/services/spa';

export type ChatEvent = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  at: number;
};

type UseSpaChatResult = {
  events: ChatEvent[];
  sending: boolean;
  error: string | null;
  send: (text: string) => Promise<string | null>;
  clear: () => void;
};

/**
 * Hook para manejar la conversación con /api/spa-chat.
 */
export function useSpaChat(initialEvents: ChatEvent[] = []): UseSpaChatResult {
  const [events, setEvents] = useState<ChatEvent[]>(initialEvents);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const lastMessages = useRef<ChatMessage[]>([]);

  const pushEvent = useCallback((role: ChatEvent['role'], content: string) => {
    setEvents((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, role, content, at: Date.now() },
    ]);
  }, []);

  // Forzamos el tipo explícito a ChatMessage[]
  const messagesForRequest: ChatMessage[] = useMemo(() => {
    return events.map<ChatMessage>((e) => ({ role: e.role, content: e.content }));
  }, [events]);

  const send = useCallback(
    async (text: string): Promise<string | null> => {
      const clean = text.trim();
      if (!clean || sending) return null;

      setError(null);
      pushEvent('user', clean);
      setSending(true);

      try {
        // Definimos explícitamente el mensaje de usuario como ChatMessage
        const userMsg: ChatMessage = { role: 'user', content: clean };

        // Definimos explícitamente el body como SendSpaChatRequest
        const body: SendSpaChatRequest = {
          messages: [...messagesForRequest, userMsg],
        };

        lastMessages.current = body.messages;

        const answer = await sendSpaChat(body);
        pushEvent('assistant', answer);
        return answer;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        pushEvent('assistant', `No pude contactar al backend (/api/spa-chat). ${msg}`);
        return null;
      } finally {
        setSending(false);
      }
    },
    [messagesForRequest, pushEvent, sending],
  );

  const clear = useCallback(() => {
    setEvents([]);
    setError(null);
    lastMessages.current = [];
  }, []);

  return { events, sending, error, send, clear };
}

export default useSpaChat;
