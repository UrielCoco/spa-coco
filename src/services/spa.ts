// src/services/spa.ts
export type ChatRole = "user" | "assistant" | "system";
export type ChatMessage = { role: ChatRole; content: string };

export type SendSpaChatRequest = { messages: ChatMessage[] };
export type SendSpaChatSuccess = { ok: true; message: ChatMessage; usage?: any };
export type SendSpaChatError = { ok: false; error: string };
export type SendSpaChatResponse = SendSpaChatSuccess | SendSpaChatError;

export async function sendSpaChat(
  messages: ChatMessage[],
  opts?: { signal?: AbortSignal }
): Promise<SendSpaChatSuccess> {
  const res = await fetch("/api/spa-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages } satisfies SendSpaChatRequest),
    signal: opts?.signal,
    cache: "no-store",
  });

  const text = await res.text();
  let json: SendSpaChatResponse;

  try {
    json = JSON.parse(text);
  } catch {
    console.error("[sendSpaChat] Bad JSON from /api/spa-chat:", text);
    throw new Error(`Bad JSON from /api/spa-chat: ${text}`);
  }

  if (!res.ok || !json.ok) {
    const msg =
      (json as SendSpaChatError)?.error ?? `HTTP ${res.status}: ${res.statusText}`;
    console.error("[sendSpaChat] Error:", msg);
    throw new Error(msg);
  }

  return json as SendSpaChatSuccess;
}
