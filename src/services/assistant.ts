import { safeFetch } from "@/lib/fetch"

export type ChatRole = "user" | "assistant" | "system"

export type ChatMessage = {
  role: ChatRole
  content: string
}

type StreamEvent =
  | "meta"
  | "delta"
  | "token"
  | "message"
  | "tool"
  | "final"
  | "done"
  | "error"

export type StartStreamOptions = {
  signal?: AbortSignal
  onEvent: (evt: StreamEvent, payload?: unknown) => void
  onError?: (err: unknown) => void
}

export async function startStream(
  messages: ChatMessage[],
  { signal, onEvent, onError }: StartStreamOptions
): Promise<void> {
  const base = (import.meta.env.VITE_ASSISTANT_BASE_URL || "/api").trim()
  const model = import.meta.env.VITE_ASSISTANT_MODEL
  const apiKey = import.meta.env.VITE_ASSISTANT_API_KEY
  const endpoint = `${base.replace(/\/$/, "")}/chat`

  try {
    const resp = await safeFetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ messages, model, stream: true }),
      signal,
    })

    if (!resp.ok) {
      const text = await resp.text().catch(() => "")
      throw new Error(`HTTP ${resp.status}: ${text}`)
    }

    const reader = resp.body?.getReader()
    if (!reader) throw new Error("No stream body")

    const decoder = new TextDecoder()
    let buf = ""

    const emit = (chunk: string) => {
      const lines = chunk.split("\n")
      let event: StreamEvent = "message"
      let data = ""

      for (const raw of lines) {
        const line = raw.trim()
        if (!line) continue
        if (line.startsWith("event:")) {
          event = (line.slice(6).trim() as StreamEvent) || "message"
        } else if (line.startsWith("data:")) {
          data = line.slice(5).trim()
        }
      }
      if (!lines.some((l) => l.startsWith("event:"))) {
        event = "delta"
        data = chunk.trim()
      }
      if (event === "delta" || event === "token")
        return onEvent("delta", safe(data))
      if (event === "tool") return onEvent("tool", safe(data))
      if (event === "final" || event === "done")
        return onEvent(event, safe(data))
      if (event === "meta" || event === "message")
        return onEvent(event, safe(data))
      if (event === "error") return onEvent("error", safe(data))
    }

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })

      let sep = buf.indexOf("\n\n")
      while (sep !== -1) {
        const chunk = buf.slice(0, sep)
        buf = buf.slice(sep + 2)
        emit(chunk)
        sep = buf.indexOf("\n\n")
      }
    }
    if (buf.trim()) emit(buf)
    onEvent("done", {})
  } catch (err) {
    onError?.(err)
    onEvent("error", err instanceof Error ? err.message : String(err ?? "unknown"))
  }
}

function safe(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return s
  }
}
