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

  // {content:[{type:'output_text'|'input_text', text:'...'}]}
  if (p?.content && Array.isArray(p.content)) {
    const textItem = p.content.find((x: any) => x?.type?.includes("text"))
    if (textItem?.text) return String(textItem.text)
    if (typeof p.content[0] === "string") return String(p.content[0])
  }

  // {delta:'...'} o {message:'...'} o {text:'...'}
  if (typeof p.delta === "string") return p.delta
  if (typeof p.message === "string") return p.message
  if (typeof p.text === "string") return p.text

  return ""
}

/** Normaliza el payload de tool a un objeto simple de argumentos */
function unwrapToolPayload(payload: any): any {
  let raw = payload
  try { raw = typeof raw === "string" ? JSON.parse(raw) : raw } catch {}
  if (!raw || typeof raw !== "object") return undefined

  // Forma: { name, arguments } (OpenAI tools)
  if ("arguments" in raw) {
    const args = (raw as any).arguments
    try { return typeof args === "string" ? JSON.parse(args) : args } catch { return args }
  }

  // Forma directa: { partial: {...} } o el objeto plano
  return raw
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
              const args = unwrapToolPayload(payload) || {}
              // Compatibilidad: a veces viene { partial: {...} }
              const partial = (args && typeof args === "object" && "partial" in args) ? (args as any).partial : args
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
