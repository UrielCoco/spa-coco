// /hooks/useSpaChat.ts
import { useCallback, useState, useRef } from 'react';
import { deepMerge, Itinerary } from '../lib/itinerary';

type Message = { role: 'user' | 'assistant'; content: string };

export function useSpaChat() {
  const [itinerary, setItinerary] = useState<Itinerary>({});
  const [loading, setLoading] = useState(false);

  // Buffer por tool_call.id para reconstruir JSON de argumentos por deltas
  const partialBuffers = useRef<Map<string, string>>(new Map());

  const send = useCallback(async (messages: Message[]) => {
    setLoading(true);
    partialBuffers.current.clear();

    const res = await fetch('/api/spa-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });

    if (!res.body) {
      setLoading(false);
      throw new Error('La respuesta no trae stream (body vacío)');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let carry = '';
    let current = { event: '', data: '' };

    const handleSse = (evt: string, data: string) => {
      try {
        const payload = data ? JSON.parse(data) : {};
        // 1) Deltas de argumentos (pintado opcional "en vivo")
        if (evt === 'tool_call.arguments.delta') {
          const id: string | undefined = payload?.data?.id;
          const delta: string = payload?.data?.arguments?.delta ?? '';
          if (id && delta) {
            const prev = partialBuffers.current.get(id) ?? '';
            const next = prev + delta;
            partialBuffers.current.set(id, next);

            // Si por casualidad ya es JSON válido, mergeamos para visualización en vivo
            const trimmed = next.trim();
            if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
              try {
                const patch = JSON.parse(trimmed) as Itinerary;
                setItinerary((curr) => deepMerge(curr, patch));
              } catch {
                // Aún no es JSON válido completo: ignoramos
              }
            }
          }
          return;
        }

        // 2) Tool finalizado → este es el que manda el JSON definitivo
        if (evt === 'tool_call.completed') {
          const toolName = payload?.data?.tool_name;
          if (toolName === 'upsert_itinerary') {
            // El backend coloca el JSON completo en data.arguments (string)
            const args = payload?.data?.arguments ?? '{}';
            const patch = typeof args === 'string' ? JSON.parse(args) : args;
            setItinerary((curr) => deepMerge(curr, patch));
          }
          return;
        }

        // 3) Run finalizado
        if (evt === 'done') {
          setLoading(false);
        }
      } catch {
        // silencioso para no romper el stream por un JSON parcial
      }
    };

    const flushLine = (line: string) => {
      if (!line) return; // línea vacía (separador)
      if (line.startsWith('event:')) {
        current.event = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        current.data = line.slice(5).trim();
        handleSse(current.event, current.data);
        current = { event: '', data: '' };
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      carry += decoder.decode(value, { stream: true });

      // SSE suele venir como bloques separados por \n\n. Procesamos línea a línea.
      const lines = carry.split(/\r?\n/);
      carry = lines.pop() ?? '';
      for (const line of lines) flushLine(line);
    }

    setLoading(false);
  }, []);

  return { send, itinerary, loading };
}
