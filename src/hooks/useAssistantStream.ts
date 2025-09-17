// src/hooks/useAssistantStream.ts
import { useCallback, useRef, useState } from 'react'
import { useAssistantDebug } from '@/store/assistantDebug.store'

export type Message = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: number
}

export interface UseAssistantStream {
  messages: Message[]
  isLoading: boolean
  sendMessage: (text: string) => Promise<void>
  clear: () => void
}

function logEvent(kind: string, data: unknown, runId?: string, threadId?: string) {
  const addEvent = useAssistantDebug.getState().addEvent
  addEvent({ kind: (kind as any) ?? 'debug', data, runId, threadId })
}

export default function useAssistantStream(): UseAssistantStream {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const controllerRef = useRef<AbortController | null>(null)

  const clear = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setMessages([])
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    setIsLoading(true)

    const userMsg: Message = {
      id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
      role: 'user',
      content: text,
      createdAt: Date.now(),
    }
    setMessages((m) => [...m, userMsg])

    controllerRef.current = new AbortController()
    const signal = controllerRef.current.signal

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
        signal,
      })
      if (!res.body) throw new Error('La respuesta no trae body (stream).')

      logEvent('response.start', { message: text })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let idx: number
        while ((idx = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, idx).trim()
          buffer = buffer.slice(idx + 1)
          if (!line) continue

          try {
            const ev: any = JSON.parse(line)

            logEvent(ev?.type ?? 'response.delta', ev, ev?.run_id, ev?.thread_id)

            if (ev?.type === 'response.output_text.delta' && ev?.delta) {
              const delta = String(ev.delta)
              setMessages((m) => {
                const last = m[m.length - 1]
                if (!last || last.role !== 'assistant') {
                  const assistantMsg: Message = {
                    id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
                    role: 'assistant',
                    content: delta,
                    createdAt: Date.now(),
                  }
                  return [...m, assistantMsg]
                }
                const copy = m.slice()
                copy[copy.length - 1] = { ...last, content: last.content + delta }
                return copy
              })
            }

            if (ev?.type === 'response.output_item.added' && ev?.item) {
              // Aquí podrías hacer merge al itinerario con ev.item.arguments
              logEvent('response.output_item.added', ev.item)
            }

            if (ev?.type === 'response.output_text.done') {
              logEvent('response.output_text.done', ev)
            }

            if (ev?.type === 'response.completed') {
              logEvent('response.completed', ev)
            }
          } catch {
            // Línea no-JSON; la guardamos como debug
            logEvent('debug', { line })
          }
        }
      }
    } catch (err: any) {
      logEvent('error', { message: String(err), err })
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
          role: 'assistant',
          content: 'Hubo un problema al procesar la respuesta.',
          createdAt: Date.now(),
        },
      ])
    } finally {
      setIsLoading(false)
      controllerRef.current = null
    }
  }, [])

  return { messages, isLoading, sendMessage, clear }
}
