// src/hooks/useAssistantStream.ts
import { useRef, useState } from 'react'
import type { ChatMessage } from '@/services/assistant'
import { startStream } from '@/services/assistant'

const SYSTEM_PROMPT = `
Eres un asistente de viajes. Responde al usuario y cuando tengas datos del itinerario
emite un evento SSE "itinerary" con JSON Partial<Itinerary> (labels opcional). Solo JSON en "itinerary".
`

export function useAssistantStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', content: SYSTEM_PROMPT },
  ])
  const [streaming, setStreaming] = useState(false)
  const [pendingText, setPendingText] = useState('')

  const bufferRef = useRef<string>('')
  const flushTimerRef = useRef<number | null>(null)
  const cancelRef = useRef<(() => void) | null>(null)

  const startFlush = () => {
    if (flushTimerRef.current) return
    flushTimerRef.current = window.setInterval(() => {
      if (bufferRef.current) {
        setPendingText(prev => prev + bufferRef.current)
        bufferRef.current = ''
      }
    }, 60) as unknown as number
  }
  const stopFlush = () => {
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current)
      flushTimerRef.current = null
    }
  }

  const send = async (content: string) => {
    cancelRef.current?.()
    const payload = [...messages, { role: 'user' as const, content }]
    setMessages(payload)
    setPendingText('')
    setStreaming(true)
    bufferRef.current = ''
    startFlush()

    cancelRef.current = await startStream(payload, (type, data) => {
      if (type === 'token') {
        bufferRef.current += String(data)
      } else if (type === 'tool') {
        stopFlush()
        setMessages(ms => [...ms, { role: 'assistant', content: (pendingText + bufferRef.current).trim() }])
        bufferRef.current = ''
        setPendingText('')
        const toolMsg = { role: 'assistant' as const, content: `\n[tool-call]\n` + JSON.stringify(data, null, 2) }
        setMessages(ms => [...ms, toolMsg])
        setStreaming(false)
      } else if (type === 'final') {
        stopFlush()
        if (bufferRef.current || pendingText) {
          setMessages(ms => [...ms, { role: 'assistant', content: (pendingText + bufferRef.current).trim() }])
          bufferRef.current = ''
          setPendingText('')
        }
        setStreaming(false)
      }
    })
  }

  return { messages, streaming, pendingText, send, setMessages }
}
