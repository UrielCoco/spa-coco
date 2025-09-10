// src/services/assistant.ts

export type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string }

/**
 * Simple module-level thread id to preserve conversation across turns.
 * If the backend emits `event: meta` with { threadId }, we store it here
 * and include it in the next request body automatically.
 */
let __threadId__: string | null = null

/**
 * Start an SSE chat run with the backend.
 * The backend contract we target here:
 *  - POST body:
 *      {
 *        message: { role: 'user', parts: [{ type: 'text', text: string }] },
 *        threadId?: string
 *      }
 *  - SSE events:
 *      - event: meta      data: {"threadId":"..."}
 *      - event: delta     data: {"value":"..."}
 *      - event: itinerary data: { ... }   // optional, Partial<Itinerary>
 *      - event: final     data: {"text":"..."} or string
 *      - event: error     data: {"message":"..."} or string
 */
export async function startStream(
  messages: ChatMessage[],
  onEvent: (type: 'token' | 'tool' | 'final' | 'error', data: any) => void
): Promise<() => void> {
  const raw = (import.meta.env.VITE_ASSISTANT_BASE_URL || '').trim()
  if (!raw) throw new Error('Missing VITE_ASSISTANT_BASE_URL')
  // Normalize: remove trailing slashes/spaces
  const url = raw.replace(/\s+/g, '').replace(/\/+$/, '')
  const apiKey = import.meta.env.VITE_ASSISTANT_API_KEY

  // Take last user message content (what we want to send to backend)
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')
  const userText = lastUser?.content ?? ''

  const controller = new AbortController()

  const body: any = {
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
  let buf = ''

  ;(async () => {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })

      // SSE frames are separated by blank line
      for (;;) {
        const sep = buf.indexOf('\n\n')
        if (sep === -1) break
        const chunk = buf.slice(0, sep).trim()
        buf = buf.slice(sep + 2)

        let event = 'message'
        let data = ''
        for (const line of chunk.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim()
          else if (line.startsWith('data:')) data += line.slice(5).trim()
        }

        // Map backend events to UI handlers
        try {
          if (event === 'meta') {
            const meta = JSON.parse(data)
            if (meta?.threadId) __threadId__ = String(meta.threadId)
            continue
          }

          if (event === 'delta' || event === 'token') {
            // backend sends {"value":"..."}
            let text = ''
            try {
              const obj = JSON.parse(data)
              text = typeof obj?.value === 'string' ? obj.value : String(data)
            } catch {
              text = String(data)
            }
            onEvent('token', text)
            continue
          }

          if (event === 'itinerary' || event === 'tool') {
            let payload: any = null
            try {
              const obj = JSON.parse(data)
              payload = obj?.payload ?? obj
            } catch {
              // ignore parse errors
            }
            if (payload) onEvent('tool', payload)
            continue
          }

          if (event === 'final' || event === 'done') {
            let finalText: any = data
            try {
              const obj = JSON.parse(data)
              finalText = obj?.text ?? obj
            } catch {
              /* keep as string */
            }
            onEvent('final', finalText)
            continue
          }

          if (event === 'error') {
            let err: any = data
            try {
              err = JSON.parse(data)
            } catch {}
            onEvent('error', err)
            continue
          }
        } catch {
          // swallow parsing errors to keep stream alive
        }
      }
    }
  })().catch(() => {
    /* ignore read errors on abort */
  })

  return () => controller.abort()
}
