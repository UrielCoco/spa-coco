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
  const bufferRef = useRef<string>("")          // acumula tokens del mensaje actual
  const hasBufferRef = useRef<boolean>(false)   // estamos armando un mensaje?

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return

      // agrega mensaje de usuario visible
      setMessages(prev => [...prev, { role: "user", content: trimmed }])

      setStreaming(true)
      bufferRef.current = ""
      hasBufferRef.current = false

      // snapshot (evita race de setState)
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
            // sólo bufferizamos, NO renderizamos
            hasBufferRef.current = true
            bufferRef.current += String(data)
            break
          }
          case "final": {
            const finalText =
              typeof data === "string" && data.length > 0
                ? data
                : bufferRef.current

            if (finalText && finalText.trim().length > 0) {
              setMessages(prev => [...prev, { role: "assistant", content: finalText }])
            }

            // resetea para permitir otro mensaje en mismo stream
            bufferRef.current = ""
            hasBufferRef.current = false
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

      setStreaming(false)
      return abortRef.current
    },
    [messages, onTool]
  )

  const abort = useCallback(() => {
    abortRef.current?.()
    abortRef.current = null
    bufferRef.current = ""
    hasBufferRef.current = false
    setStreaming(false)
  }, [])

  // por compatibilidad si necesitas setear mensajes externamente
  const replaceMessages = useCallback((next: ChatMessage[]) => {
    setMessages(next)
  }, [])

  return { messages, streaming, send, abort, setMessages: replaceMessages }
}
