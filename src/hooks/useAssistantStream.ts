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

/** Añade un delta de texto al último mensaje assistant, o crea uno si no existe */
function pushTextDelta(setMessages: React.Dispatch<React.SetStateAction<Message[]>>, delta: string) {
  if (!delta) return
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

/** Intenta extraer texto de distintos formatos de evento */
function extractText(ev: any): string | null {
  if (!ev) return null

  // Estándar Responses API:
  if (ev.type === 'response.output_text.delta' && typeof ev.delta === 'string') return ev.delta
  if (ev.type === 'response.delta' && typeof ev.delta?.text === 'string') return ev.delta.text

  // AI SDK (Vercel) formatos comunes:
  if (typeof ev.textDelta === 'string') return ev.textDelta
  if (ev.type === 'text-delta' && typeof ev.delta === 'string') return ev.delta

  // Algunos backends mandan "content": "..."
  if (typeof ev.content === 'string') return ev.content

  // message.delta con content array (OpenAI assistants/msg):
  const arr = ev?.delta?.content
  if (Array.isArray(arr)) {
    for (const c of arr) {
      if (typeof c?.text === 'string') return c.text
      if (typeof c?.value === 'string') return c.value
    }
  }

  // Por si alguien manda { answer: "..." }
  if (typeof ev.answer === 'string') return ev.answer

  return null
}

/** Procesa un evento (objeto ya parseado) */
function handleParsedEvent(
  obj: any,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
) {
  // Log para la tercera columna (intenta inferir run/thread si vienen)
  const runId = obj?.response?.id || obj?.run_id
  const threadId = obj?.response?.thread_id || obj?.thread_id
  const kind = obj?.type || 'message'

  logEvent(kind, obj, runId, threadId)

  // Si trae delta de texto, lo empujamos al chat
  const text = extractText(obj)
  if (typeof text === 'string' && text.length) {
    pushTextDelta(setMessages, text)
  }
}

/** Parser de SSE "puro" (event:/data:) y fallback NDJSON por línea */
async function readStreamAndDispatch(
  res: Response,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
) {
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()

  let buffer = ''

  // Estados para SSE
  let sseEventType: string | null = null
  let sseDataLines: string[] = []
  let usingSSE = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // Partimos por líneas (soporta \n o \r\n)
    let lineBreakIdx: number
    while ((lineBreakIdx = buffer.search(/\r?\n/)) >= 0) {
      const line = buffer.slice(0, lineBreakIdx)
      buffer = buffer.slice(lineBreakIdx + (buffer[lineBreakIdx] === '\r' ? 2 : 1))

      const trimmed = line.trim()

      // Intento de detección de protocolo SSE
      if (trimmed.startsWith('event:') || trimmed.startsWith('data:') || trimmed === '') {
        usingSSE = true
      }

      if (usingSSE) {
        // Parseo SSE
        if (trimmed.startsWith('event:')) {
          sseEventType = trimmed.slice(6).trim()
          continue
        }
        if (trimmed.startsWith('data:')) {
          sseDataLines.push(trimmed.slice(5).trim())
          continue
        }
        // Línea en blanco = fin de evento SSE
        if (trimmed === '') {
          const dataStr = sseDataLines.join('\n')
          sseDataLines = []
          const type = sseEventType || 'message'
          sseEventType = null

          if (!dataStr || dataStr === '[DONE]') {
            // Algunos backends envían [DONE] al final
            handleParsedEvent({ type: 'response.completed' }, setMessages)
            continue
          }

          try {
            const obj = JSON.parse(dataStr)
            // Normalizamos: si el backend no manda "type", usamos el del SSE
            if (!obj.type) obj.type = type
            handleParsedEvent(obj, setMessages)
          } catch {
            // data no-JSON; lo registramos como texto plano
            handleParsedEvent({ type, content: dataStr }, setMessages)
          }
          continue
        }
      } else {
        // Fallback NDJSON (una línea = un objeto)
        if (!trimmed) continue
        try {
          const obj = JSON.parse(trimmed)
          handleParsedEvent(obj, setMessages)
        } catch {
          // Línea no-JSON; la guardamos como debug
          logEvent('debug', { line: trimmed })
        }
      }
    }
  }

  // Si quedó algo en buffer (NDJSON) intenta parsear
  if (!usingSSE && buffer.trim()) {
    try {
      const obj = JSON.parse(buffer.trim())
      handleParsedEvent(obj, setMessages)
    } catch {
      logEvent('debug', { line: buffer.trim() })
    }
  }
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

    // Empuja mensaje de usuario al chat
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
      // 👉 Ajusta esta URL a tu endpoint real (POST que devuelve SSE)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
        signal,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      if (!res.body) throw new Error('La respuesta no trae body (stream).')

      // Marca inicio en la columna de debug
      logEvent('response.start', { message: text })

      // Lee el stream (soporta SSE y NDJSON)
      await readStreamAndDispatch(res, setMessages)

      // Fin
      logEvent('response.completed', {})
    } catch (err: any) {
      logEvent('error', { message: String(err), err })
      pushTextDelta(setMessages, 'Hubo un problema al procesar la respuesta.')
    } finally {
      setIsLoading(false)
      controllerRef.current = null
    }
  }, [])

  return { messages, isLoading, sendMessage, clear }
}
