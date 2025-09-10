// src/services/assistant.ts
import { safeFetch } from "@/lib/fetch"

export type ChatRole = "user" | "assistant" | "system"

export type ChatMessage = {
  role: ChatRole
  content: string
}

type StreamEvent =
  | "meta"
  | "delta" // sinónimo de 'token' en algunos backends
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

/**
 * Inicia el stream SSE contra tu endpoint /chat.
 * Contrato: startStream(messages, { onEvent, onError, signal })
 */
export async function startStream(
  messages: ChatMessage[],
  { signal, onEvent, onError }: StartStreamOptions
): Promise<void> {
  const base = import.meta.env.VITE_ASSISTANT_BASE_URL
  const model = import.meta.env.VITE_ASSISTANT_MODEL
  const apiKey = import.meta.env.VITE_ASSISTANT_API_KEY

  if (!base) throw new Error("VITE_ASSISTANT_BASE_URL no está definido")

  try {
    const resp = await safeFetch(`${sanitizeBase(base)}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        "X-Client": "itinerary-spa",
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

    // Utilidad para emitir un bloque SSE parseado
    const emitLines = (chunk: string) => {
      // Formato SSE clásico: líneas "event: X" y "data: Y" separadas por doble salto
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

      // fallback de compatibilidad: si no vino "event", tratamos como delta/token
      if (!lines.some((l) => l.startsWith("event:"))) {
        event = "delta"
        data = chunk.trim()
      }

      // Normalizar 'delta'/'token'
      if (event === "delta" || event === "token") {
        onEvent("delta", safeJsonOrText(data))
        return
      }

      if (event === "tool") {
        onEvent("tool", safeJsonOrText(data))
        return
      }

      if (event === "final" || event === "done") {
        onEvent(event, safeJsonOrText(data))
        return
      }

      if (event === "meta" || event === "message") {
        onEvent(event, safeJsonOrText(data))
        return
      }

      if (event === "error") {
        onEvent("error", safeJsonOrText(data))
        return
      }
    }

    // Leer stream incrementalmente
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })

      // Dividir por bloques SSE con doble salto de línea
      let sep = buf.indexOf("\n\n")
      while (sep !== -1) {
        const chunk = buf.slice(0, sep)
        buf = buf.slice(sep + 2)
        emitLines(chunk)
        sep = buf.indexOf("\n\n")
      }
    }

    // Procesar cualquier residuo
    if (buf.trim()) emitLines(buf)

    onEvent("done", {})
  } catch (err) {
    onError?.(err)
    onEvent("error", err instanceof Error ? err.message : String(err ?? "unknown"))
  }
}

function sanitizeBase(base: string) {
  return base.endsWith("/") ? base.slice(0, -1) : base
}

function safeJsonOrText(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return s
  }
}
