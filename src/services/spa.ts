// src/services/spa.ts
export type Role = 'user' | 'assistant' | 'system';

export type ChatMessage = {
  role: Role;
  content: string;
};

export type SendSpaChatRequest = {
  messages: ChatMessage[];
};

export type AssistantEvent =
  | { event: 'assistant'; payload: { content: string } }
  | { event: 'itinerary'; payload: { partial: Record<string, unknown> } };

export type SendSpaChatResponse =
  | { ok: true; events: AssistantEvent[] }
  | { ok: false; error: string };

export async function sendSpaChat(
  body: SendSpaChatRequest,
): Promise<AssistantEvent[]> {
  const res = await fetch('/api/spa-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as SendSpaChatResponse;

  if (!res.ok || !json || (json as any).ok === false) {
    const msg = (json as any)?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return (json as { ok: true; events: AssistantEvent[] }).events;
}
