// src/services/spa.ts

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type SendSpaChatRequest = {
  messages: ChatMessage[];
};

/**
 * Llama a /api/spa-chat y devuelve el contenido de texto del assistant.
 * El endpoint puede responder:
 *  - text/plain  -> devolvemos tal cual
 *  - application/json -> intentamos leer { text } o { message }
 *  - stream deshabilitado -> acumulamos como texto
 */
export async function sendSpaChat(payload: SendSpaChatRequest): Promise<string> {
  const res = await fetch('/api/spa-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // Intenta leer como texto primero (cubrir streams/edge handlers que ya devuelven texto)
  const raw = await res.text();

  // Si no es OK, re-portamos el texto como error para que suba al UI/Logs
  if (!res.ok) {
    throw new Error(raw || `HTTP ${res.status}`);
  }

  // Algunos backends envían JSON con { text: string }
  try {
    const maybe = JSON.parse(raw);
    if (maybe && typeof maybe === 'object') {
      if (typeof maybe.text === 'string') return maybe.text;
      if (typeof maybe.message === 'string') return maybe.message;
    }
  } catch {
    // no era JSON; continuar
  }

  return raw;
}
