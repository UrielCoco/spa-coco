// src/services/assistant.ts
export type ChatMessage = { role: 'user' | 'assistant' | 'system', content: string }

export async function startStream(
  messages: ChatMessage[],
  onEvent: (type: 'token'|'tool'|'final'|'error', data: any)=>void
): Promise<() => void> {
  const url = import.meta.env.VITE_ASSISTANT_BASE_URL
  if (!url) throw new Error('Missing VITE_ASSISTANT_BASE_URL')
  const model = import.meta.env.VITE_ASSISTANT_MODEL
  const apiKey = import.meta.env.VITE_ASSISTANT_API_KEY

  const controller = new AbortController()
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ model, stream: true, messages }),
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
      for (;;) {
        const sep = buf.indexOf('\n\n')
        if (sep === -1) break
        const chunk = buf.slice(0, sep).trim()
        buf = buf.slice(sep + 2)

        let event = 'message'
        let data = ''
        for (const line of chunk.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim()
          if (line.startsWith('data:')) data += line.slice(5).trim()
        }

        // Mapeo a tus eventos reales
        if (event === 'delta' || event === 'token') onEvent('token', data)
        else if (event === 'itinerary' || event === 'tool') {
          try { onEvent('tool', JSON.parse(data)) } catch {}
        } else if (event === 'final' || event === 'done') onEvent('final', data)
        else if (event === 'error') onEvent('error', data)
      }
    }
  })().catch(() => {/* ignore */})

  return () => controller.abort()
}
