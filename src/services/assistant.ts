// src/services/assistant.ts

export type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string }

/**
 * Conserva el threadId entre turnos si el backend lo envía en `event: meta`.
 */
let __threadId__: string | null = null

/**
 * Inicia el stream SSE contra tu backend.
 * Contrato esperado del backend:
 *  - POST body:
 *      {
 *        message: { role: 'user', parts: [{ type: 'text', text: string }] },
 *        threadId?: string
 *      }
 *  - SSE events:
 *      - event: meta      data: {"threadId":"..."}
 *      - event: delta     data: {"value":"..."} | "..."
 *      - event: itinerary data: { ... }   // parcial de Itinerary (opcional)
 *      - event: final     data: {"text":"..."} | "..."
 *      - event: error     data: {"message":"..."} | "..."
 */
export async function startStream(
  messages: ChatMessage[],
  onEvent: (type: 'token' | 'tool' | 'final' | 'error', data: any) => void
): Promise<() => void> {
  const raw = (import.meta.env.VITE_ASSISTANT_BASE_URL || '').trim()
  if (!raw) throw new Error('Missing VITE_ASSISTANT_BASE_URL')
  const url = raw.replace(/\s+/g, '').replace(/\/+$/, '') // sanea

  const apiKey = import.meta.env.VITE_ASSISTANT_API_KEY

  // último mensaje de usuario
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')
  const userText = lastUser?.content ?? ''

  const controller = new AbortController()

  const body: Record<string, any> = {
    message: {
      role: 'user',
      parts: [{ type: 'text', text: userText }],
    },
  }
  if (__threadId__) body.threadId = __threadId__

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  })

  if (!resp.ok) {
    onEvent('error', { status: resp.status })
    throw new Error(`HTTP ${resp.status}`)
  }
  if (!resp.body) throw new Error('No stream body')

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()

  // --------- Parser SSE robusto (evita cortes) ----------
  let lineBuf = '' // compone línea
  let eventName = '' // nombre del evento actual
  let dataLines: string[] = [] // acumula todas las líneas data:

  const emit = () => {
    const data = dataLines.join('\n')
    const evt = (eventName || 'message').trim()

    try {
      if (evt === 'meta') {
        const meta = safeJSON(data)
        if (meta?.threadId) __threadId__ = String(meta.threadId)
        return
      }

      if (evt === 'delta' || evt === 'token') {
        // backend manda {"value":"..."} o string plano
        const obj = safeJSON(data)
        const text = typeof obj?.value === 'string' ? obj.value : (typeof obj === 'string' ? obj : data)
        onEvent('token', text)
        return
      }

      if (evt === 'itinerary' || evt === 'tool') {
        const obj = safeJSON(data)
        const payload = obj?.payload ?? obj
        if (payload) onEvent('tool', payload)
        return
      }

      if (evt === 'final' || evt === 'done') {
        const obj = safeJSON(data)
        const text = obj?.text ?? (typeof obj === 'string' ? obj : data)
        onEvent('final', text)
        return
      }

      if (evt === 'error') {
        const obj = safeJSON(data) ?? data
        onEvent('error', obj)
        return
      }
    } finally {
      // reset buffers
      eventName = ''
      dataLines.length = 0
    }
  }

  const processChunk = (text: string) => {
    for (let i = 0; i < text.length; i++) {
      const ch = text[i]
      if (ch === '\n') {
        const line = lineBuf.endsWith('\r') ? lineBuf.slice(0, -1) : lineBuf
        lineBuf = ''

        if (line === '') {
          if (dataLines.length > 0 || eventName) emit()
        } else if (line.startsWith('event:')) {
          eventName = line.slice(6).trim()
        } else if (line.startsWith('data:')) {
          // Preserva espacios excepto el inicial tras "data:"
          dataLines.push(line.slice(5).replace(/^\s/, ''))
        }
      } else {
        lineBuf += ch
      }
    }
  }
  // ------------------------------------------------------

  ;(async () => {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      processChunk(decoder.decode(value, { stream: true }))
    }
    // Flush final por si quedó algo sin \n
    if (lineBuf.length) processChunk('\n')
    if (dataLines.length || eventName) emit()
  })().catch(() => {
    /* ignore read errors on abort */
  })

  return () => controller.abort()
}

function safeJSON(s: string): any | null {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}
