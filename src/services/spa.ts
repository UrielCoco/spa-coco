/* src/services/spa.ts */
export type Role = "user" | "assistant" | "system";
export type ChatMessage = { role: Role; content: string };

export type SpaEvent =
  | { type: "assistant"; delta: string }
  | { type: "assistant_done"; content: string }
  | { type: "itinerary"; partial: any }
  | { type: "error"; message: string }
  | { type: "done" };

export type SendSpaChatRequest = {
  messages: ChatMessage[];
};

export async function sendSpaChat(
  req: SendSpaChatRequest,
  onEvent: (ev: SpaEvent) => void
) {
  const res = await fetch("/api/spa-chat", {
    method: "POST",
    body: JSON.stringify(req),
    headers: { "content-type": "application/json" },
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    onEvent({
      type: "error",
      message: `HTTP ${res.status} al contactar /api/spa-chat: ${text}`,
    });
    onEvent({ type: "done" });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const flush = (chunk: string) => {
    buffer += chunk;
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const pkt of parts) {
      const lines = pkt.split("\n");
      let event = "message";
      let data = "";

      for (const line of lines) {
        if (line.startsWith("event: ")) event = line.slice(7).trim();
        else if (line.startsWith("data: ")) data += line.slice(6);
      }

      try {
        const parsed = data ? JSON.parse(data) : {};
        switch (event) {
          case "assistant":
            onEvent({ type: "assistant", delta: parsed.delta ?? "" });
            break;
          case "assistant_done":
            onEvent({ type: "assistant_done", content: parsed.content ?? "" });
            break;
          case "itinerary":
            onEvent({ type: "itinerary", partial: parsed.partial });
            break;
          case "error":
            onEvent({ type: "error", message: parsed.message ?? "Error" });
            break;
          case "done":
            onEvent({ type: "done" });
            break;
          default:
            // ignoramos
            break;
        }
      } catch {
        // paquete malformado, ignorar
      }
    }
  };

  // stream loop
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      if (buffer) flush("\n\n");
      break;
    }
    flush(decoder.decode(value, { stream: true }));
  }
}
