import { useCallback, useRef, useState } from "react"
import type { ChatMessage } from "@/services/assistant"
import { startStream } from "@/services/assistant"
import { mergeItinerary, extractLabels } from "@/services/parsers"
import { useItinerary } from "@/store/itinerary.store"

type Args = { onTool?: (json: any) => void }

/** Intenta sacar la parte de texto de los distintos formatos que puede mandar el SSE */
function pickText(payload: unknown): string {
  if (payload == null) return ""
  if (typeof payload === "string") return payload

  const p = payload as any

  // Formatos más comunes
  if (typeof p?.value === "string") return p.value
  if (typeof p?.delta === "string") return p.delta
  if (typeof p?.text === "string") return p.text
  if (typeof p?.content === "string") return p.content

  // A veces viene como arrays de objetos con text
  if (Array.isArray(p?.content) && typeof p.content[0]?.text === "string") {
    return p.content[0].text
  }
  if (Array.isArray(p?.parts) && typeof p.parts[0]?.text === "string") {
    return p.parts[0].text
  }

  // Si trae un objeto tipo { output_text: "..." }
  if (typeof p?.output_text === "string") return p.output_text

  // Fallback: nada de texto
  return ""
}

export function useAssistantStream({ onTool }: Args = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(
    async (text: string) => {
      const next: ChatMessage[] = [...messages, { role: "user", content: text }]
      setMessages(next)
      setStreaming(true)

      const controller = new AbortController()
      abortRef.current = controller

      await startStream(next, {
        signal: controller.signal,
        onEvent: (evt, payload) => {
          if (evt === "delta" || evt === "token" || evt === "message") {
            const piece = pickText(payload)
            if (!piece) return
            setMessages((curr) => {
              const last = curr[curr.length - 1]
              if (!last || last.role !== "assistant") {
                return [...curr, { role: "assistant", content: piece }]
              }
              return [...curr.slice(0, -1), { ...last, content: last.content + piece }]
            })
          } else if (evt === "tool") {
            try {
              const partial = typeof payload === "string" ? JSON.parse(payload) : (payload as any)
              mergeItinerary(partial)
              const labels = extractLabels(partial)
              if (labels) useItinerary.getState().mergeItinerary({ labels })
              onTool?.(partial)
            } catch (e) {
              console.error("tool parse error", e)
            }
          } else if (evt === "final" || evt === "done") {
            setStreaming(false)
          } else if (evt === "error") {
            console.error("[stream error]", payload)
            setStreaming(false)
          }
        },
        onError: () => setStreaming(false),
      })
    },
    [messages, onTool]
  )

  const abort = () => abortRef.current?.abort()

  return { messages, setMessages, send, abort, streaming } as const
}
