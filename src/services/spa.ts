// src/services/spa.ts
// @ts-nocheck

export type Role = "user" | "assistant" | "system" | "tool";

export type ChatMessage = {
  role: Role;
  content: string;
  // opcional: para tool calls / blobs
  name?: string;
  // si necesitas anexar objetos
  payload?: unknown;
};

export type SendSpaChatRequest = {
  messages: ChatMessage[];
  system?: string;
  tools?: any;
  metadata?: Record<string, any>;
};

export type AssistantEvent =
  | { type: "assistant_text_delta"; text: string }
  | { type: "assistant_text_done"; text: string }
  | { type: "assistant_message"; message: any } // mensaje ya armado
  | { type: "tool_call_delta"; name: string; argsDelta: string }
  | { type: "tool_call_done"; name: string; args: any }
  | { type: "raw"; event: any }
  | { type: "error"; error: any }
  | { type: "done" };

const isSSELine = (line: string) => line.startsWith("data: ");

export async function* streamSpaChat(
  req: SendSpaChatRequest,
): AsyncGenerator<AssistantEvent, void, unknown> {
  const res = await fetch("/api/spa-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok || !res.body) {
    yield { type: "error", error: { status: res.status, message: "HTTP error" } };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const raw of parts) {
        const line = raw.trim();
        if (!line) continue;

        // Soportamos "event: done" y "data: ..."
        if (line.startsWith("event: done")) {
          yield { type: "done" };
          continue;
        }

        const dataLine = line.split("\n").find(isSSELine);
        if (!dataLine) continue;

        const json = dataLine.slice("data: ".length);
        let evt: any;
        try {
          evt = JSON.parse(json);
        } catch {
          continue;
        }

        // Emitimos evento bruto
        yield { type: "raw", event: evt };

        // Interpretación mínima de eventos de OpenAI Responses
        // Texto delta
        if (evt.type === "response.output_text.delta") {
          yield { type: "assistant_text_delta", text: evt.delta || "" };
        }
        if (evt.type === "response.output_text.done") {
          yield { type: "assistant_text_done", text: evt.output_text || "" };
        }

        // Mensajes (con partes)
        if (evt.type === "message") {
          yield { type: "assistant_message", message: evt.message };
        }

        // Function call / tool call
        if (evt.type === "response.function_call.arguments.delta") {
          yield {
            type: "tool_call_delta",
            name: evt.name || "tool",
            argsDelta: evt.arguments_delta || "",
          };
        }
        if (evt.type === "response.function_call.completed") {
          let args: any = {};
          try {
            args = evt.arguments ? JSON.parse(evt.arguments) : {};
          } catch {
            args = { _raw: evt.arguments };
          }
          yield {
            type: "tool_call_done",
            name: evt.name || "tool",
            args,
          };
        }

        if (evt.ok === false && evt.error) {
          yield { type: "error", error: evt.error };
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
