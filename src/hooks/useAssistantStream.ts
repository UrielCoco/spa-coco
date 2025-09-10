// src/hooks/useAssistantStream.ts
import { useCallback, useRef, useState } from "react"
import type { ChatMessage } from "@/services/assistant"
import { startStream } from "@/services/assistant"

type HookArgs = {
  onTool?: (payload: any) => void
}

const LOG = (import.meta.env.VITE_LOG_SSE ?? "0") !== "0"

export function useAssistantStream(args: HookArgs = {}) {
  const { onTool } = args

  // Mensajes completos que renderiza el chat
  const [messages, setMessagesState] = useState<ChatMessage[]>([])

  // Texto temporal mientras llegan tokens del assistant para el mensaje EN CURSO
  const [pendingText, setPendingText] = useState("")

  // Flag UI
  const [streaming, setStreaming] = useState(false)

  // Control de stream actual
  const abortRef = useRef<null | (() => void)>(null)

  // Índice del mensaje del assistant que estamos rellenando con tokens
  const streamIdxRef = useRef<number | null>(null)

  /** Setter compatible con el patrón que usas en tu ChatPanel */
  const setMessages = useCallback(
    (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      setMessagesState((prev) => updater(prev))
    },
    []
  )

  /** Crea (si hace falta) el placeholder del assistant y devuelve su índice */
  const ensureAssistantPlaceholder = useCallback(() => {
    if (streamIdxRef.current != null) return streamIdxRef.current
    setMessagesState((prev) => {
      const idx = prev.length
      streamIdxRef.current = idx
      return [...prev, { role: "assistant", content: "" }]
    })
    return streamIdxRef.current!
  }, [])

  /** Actualiza el contenido del assistant (append tokens) */
  const updateAssistant = useCallback((nextText: string) => {
    const idx = ensureAssistantPlaceholder()
    setMessagesState((prev) => {
      const out = [...prev]
      out[idx] = { role: "assistant", content: nextText }
      return out
    })
  }, [ensureAssistantPlaceholder])

  /** Cierra el mensaje en curso (al recibir `final`) y permite que llegue otro */
  const closeAssistant = useCallback((finalText: string) => {
    const idx = streamIdxRef.current
    if (idx == null) {
      setMessagesState((prev) => [...prev, { role: "assistant", content: finalText }])
    } else {
      setMessagesState((prev) => {
        const out = [...prev]
        out[idx] = { role: "assistant", content: finalText }
        return out
      })
    }
    streamIdxRef.current = null
    setPendingText("")
  }, [])

  /** Envía texto del usuario y arranca el stream */
  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return

      // Añade el mensaje del usuario al historial visible
      setMessagesState((prev) => [...prev, { role: "user", content: trimmed }])

      setStreaming(true)
      setPendingText("")
      streamIdxRef.current = null

      // Snapshot del historial + el mensaje recién enviado
      // (evitamos race de setState)
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
            const token = String(data)
            setPendingText((prev) => {
              const next = prev + token
              updateAssistant(next)
              return next
            })
            break
          }
          case "final": {
            closeAssistant(String(data))
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
    [messages, onTool, updateAssistant, closeAssistant]
  )

  /** Cancela el stream actual */
  const abort = useCallback(() => {
    abortRef.current?.()
    abortRef.current = null
    streamIdxRef.current = null
    setPendingText("")
    setStreaming(false)
  }, [])

  return {
    messages,
    pendingText,
    streaming,
    send,
    setMessages, // compat con tu componente
    abort,
  }
}
