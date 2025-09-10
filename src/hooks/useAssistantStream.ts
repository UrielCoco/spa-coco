// src/hooks/useAssistantStream.ts
import { useCallback, useRef, useState } from "react"
import type { ChatMessage } from "@/services/assistant"
import { startStream } from "@/services/assistant"

type HookArgs = { onTool?: (payload: any) => void }

const LOG = (import.meta.env.VITE_LOG_SSE ?? "0") !== "0"

export function useAssistantStream({ onTool }: HookArgs = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)

  const abortRef = useRef<null | (() => void)>(null)
  const bufferRef = useRef<string>("")

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return

      // agrega el mensaje de usuario visible
      setMessages(prev => [...prev, { role: "user", content: trimmed }])

      // inicia estado de “pensando”
      setStreaming(true)
      bufferRef.current = ""

      // snapshot del historial (evita race con setState async)
      const snapshot: ChatMessage[] = [
        ...messages,
        { role: "user", content: trimmed },
      ]

      abortRef.current = await startStream(snapshot, (type, data) => {
        if (LOG) {
          const len = typeof data === "string" ? data.length : JSON.stringify(data).length
          console.log("[CHAT]", type, "len:", len)
        }

        switch (type) {
          case "token": {
            bufferRef.current += String(data)
            break
          }
          case "final": {
            const finalText =
              typeof data === "string" && data.trim().length > 0
                ? data
                : bufferRef.current

            if (finalText && finalText.trim().length > 0) {
              setMessages(prev => [...prev, { role: "assistant", content: finalText }])
            }

            bufferRef.current = ""
            setStreaming(false) // termina esta respuesta; si llega otro token, volverá a true en send siguiente
            break
          }
          case "tool": {
            onTool?.(data)
            break
          }
          case "error": {
            console.error("[CHAT error]", data)
            setStreaming(false)
            break
          }
        }
      })

      return abortRef.current
    },
    [messages, onTool]
  )

  const abort = useCallback(() => {
    abortRef.current?.()
    abortRef.current = null
    bufferRef.current = ""
    setStreaming(false)
  }, [])

  // Por si necesitas reemplazar todo el historial
  const replaceMessages = useCallback((next: ChatMessage[]) => {
    setMessages(next)
  }, [])

  return { messages, streaming, send, abort, setMessages: replaceMessages }
}
