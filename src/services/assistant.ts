// src/services/assistant.ts
import { safeFetch } from "@/lib/fetch";

export type ChatRole = "user" | "assistant" | "system";
export type ChatMessage = { role: ChatRole; content: string };

type StreamEvent =
  | "meta"
  | "delta"
  | "tool_call.arguments.delta"
  | "tool_call.completed"
  | "done"
  | "error"
  | "message";

type OnEvent = (event: StreamEvent, payload: any) => void;
type OnError = (err: any) => void;

// 👇 BASE=/api -> armamos /spa-chat
const BASE = (import.meta.env.VITE_ASSISTANT_BASE_URL as string) || "/api";
const ENDPOINT = `${BASE.replace(/\/$/, "")}/spa-chat`;

export async function streamAssistant(
  messages: ChatMessage[],
  onEvent?: OnEvent,
  onError?: OnError
) {
  try {
    const resp = await safeFetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    if (!resp.ok || !resp.body) {
      const msg = `HTTP ${resp.status}: ${resp.statusText}`;
      onError?.(new Error(msg));
      onEvent?.("error", msg);
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";

      for (const chunk of chunks) {
        let event: StreamEvent = "message";
        let dataStr = "";

        const lines = chunk.split("\n");
        for (const raw of lines) {
          const line = raw.trim();
          if (!line) continue;
          if (line.startsWith("event:")) event = line.slice(6).trim() as StreamEvent;
          else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
        }

        let payload: any = null;
        try { payload = dataStr ? JSON.parse(dataStr) : null; }
        catch { payload = { value: dataStr }; }

        onEvent?.(event, payload);
      }
    }

    onEvent?.("done", {});
  } catch (err) {
    onError?.(err);
    onEvent?.("error", err instanceof Error ? err.message : String(err ?? "unknown"));
  }
}
