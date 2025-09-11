// src/services/assistant.ts
import { safeFetch } from "@/lib/fetch";

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

type StreamEvent =
  | "meta"
  | "delta"
  | "tool_call.arguments.delta"
  | "tool_call.completed"
  | "done"
  | "error"
  | "message";

type StartStreamOpts = {
  signal?: AbortSignal;
  onEvent?: (event: StreamEvent, data: any) => void;
  onError?: (err: any) => void;
};

/**
 * Inicia un stream SSE contra /api/spa-chat y ejecuta onEvent(event, data)
 * por cada chunk { event: "...", data: ... }.
 */
export async function startStream(
  messages: ChatMessage[],
  opts: StartStreamOpts = {}
) {
  const { signal, onEvent, onError } = opts;

  try {
    // 🔒 Valida mensajes para evitar 400
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error(
        "startStream: expected an array of messages [{ role, content }]."
      );
    }

    // 👈 USA el endpoint nuevo pensado para la SPA
    const resp = await safeFetch("/api/spa-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal,
    });

    if (!resp.ok) {
      let payload: any = null;
      try {
        payload = await resp.json();
      } catch {
        // noop
      }
      const msg = payload?.error || `HTTP ${resp.status}`;
      onError?.(new Error(msg));
      onEvent?.("error", { message: msg });
      return;
    }

    if (!resp.body) {
      const err = new Error("No response body");
      onError?.(err);
      onEvent?.("error", { message: err.message });
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n"); // SSE separa eventos con línea en blanco
      buffer = chunks.pop() ?? "";

      for (const chunk of chunks) {
        let event: StreamEvent = "message";
        let dataStr = "";

        const lines = chunk.split("\n");
        for (const raw of lines) {
          const line = raw.trim();
          if (!line) continue;
          if (line.startsWith("event:")) {
            event = line.slice(6).trim() as StreamEvent;
          } else if (line.startsWith("data:")) {
            // Puede haber múltiples líneas "data:"
            dataStr += line.slice(5).trim();
          }
        }

        // Fallback: algunos servers no incluyen "event:"
        if (!lines.some((l) => l.startsWith("event:"))) {
          event = "delta";
          dataStr = chunk.trim().replace(/^data:\s*/g, "");
        }

        let payload: any = dataStr;
        try {
          payload = JSON.parse(dataStr);
        } catch {
          // si no es JSON, dejamos el string tal cual
        }

        onEvent?.(event, payload);
      }
    }

    // Cierre "limpio"
    onEvent?.("done", {});

  } catch (err) {
    onError?.(err);
    onEvent?.(
      "error",
      err instanceof Error ? err.message : String(err ?? "unknown")
    );
  }
}
