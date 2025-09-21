// src/services/spa.ts
import type { UIMessage } from '@/types/itinerary';

type StreamSpaChatOptions = {
  messages: UIMessage[];
  onText: (chunk: string) => void;
  onToolCall?: (toolCall: any) => void;
  signal?: AbortSignal;
};

export async function streamSpaChat({
  messages,
  onText,
  onToolCall,
  signal,
}: StreamSpaChatOptions) {
  const res = await fetch('/api/spa-chat', {
    method: 'POST',
    body: JSON.stringify({ messages }),
    headers: { 'Content-Type': 'application/json' },
    signal,
  });

  if (!res.body) throw new Error('No stream body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    onText(text); // Streamea al frontend
  }
}
