// src/services/assistant.ts

export type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string }

/** Conserva el threadId entre turnos si el backend lo envía en `event: meta`. */
let __threadId__: string | null = null

/** Logging control (dev: ON por defecto; prod: usa VITE_LOG_SSE=1 para activar). */
const LOG =
  (import.meta.env.MODE === 'development' && (import.meta.env.VITE_LOG_SSE ?? '1') !== '0') ||
  (import.meta.env.MODE !== 'development' && (import.meta.env.VITE_LOG_SSE ?? '0') !== '0')

function slog(...a: any[]) {
  if (LOG) console.log('[SSE]', ...a)
}

/**
 * Inicia el stream SSE contra tu backend.
 * Contrato esperado:
 *  - POST body:
 *      { message: { role: 'user', parts: [{ type: 'text', text }] }, threadId? }
 *  - SSE events: meta({threadId}), delta({value}|string), itinerary(obj), final({text}|string),
 *                error({message}|string), done, (y cualquier otro se ignora).
 */
export async function startStream(
  messages: ChatMessage[],
  onEvent: (type: 'token' | 'tool' | 'final' | 'error', data: any) => void
): Promise<() => void> {
  const raw = (import.meta.env.VITE_ASSISTANT_BASE_URL || '').trim()
  if (!raw) throw new Error('Missing VITE_ASSISTANT_BASE_URL')
  const url = raw.replace(/\s+/g, '').replace(/\/+$/, '')

  const apiKey = import.meta.env.VITE_ASSISTANT_API_KEY

  // Último mensaje del user
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')
  const userText = lastUser?.content ?? ''

  const controller = new AbortController()

  const body: Record<string, any> = {
    message: { role: 'user', parts: [{ type: 'text', text: userText }] },
  }
  if (__threadId__) body.threadId = __threadId__

  slog('POST →', url, body)

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  })

  slog('HTTP', resp.status, resp.headers.get('content-type'))

  if (!resp.ok) {
    const t = await safeText(resp)
    slog('HTTP error body:', t)
    onEvent('error', { status: resp.status, body: t })
    throw new Error(`HTTP ${resp.status}`)
  }
  if (!resp.body) throw new Error('No stream body')

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()

  // ===== SSE robusto =====
  // Soporta: \r\n, data: multilínea, frames partidos, múltiples mensajes (varios 'final' en un mismo stream).
  let lineBuf = ''              // construye la línea actual
  let eventName = ''            // nombre del evento en curso
  let dataLines: string[] = []  // acumula TODAS las líneas data: del evento
  let frameCount = 0
  let tokenCount = 0
  let finalCount = 0

  const emit = () => {
    const data = dataLines.join('\n')
    const evt = (eventName || 'message').trim()
    frameCount++
    if (frameCount <= 20 || frameCount % 25 === 0) {
      slog('frame', frameCount, 'evt:', evt, 'len:', data.length, sample(data))
    }

    try {
      if (evt === 'meta') {
        const meta = safeJSON(data)
        if (meta?.threadId) {
          __threadId__ = String(meta.threadId)
          slog('threadId =', __threadId__)
        }
        return
      }

      if (evt === 'delta' || evt === 'token') {
        // Puede venir JSON {"value":"..."} o string plano
        const obj = safeJSON(data)
        const text = typeof obj?.value === 'string' ? obj.value : (typeof obj === 'string' ? obj : data)
        tokenCount += text.length
        if (text) onEvent('token', text)
        return
      }

      if (evt === 'itinerary' || evt === 'tool') {
        const obj = safeJSON(data)
        const payload = obj?.payload ?? obj
        if (payload) onEvent('tool', payload)
        return
      }

      if (evt === 'final') {
        finalCount++
        const obj = safeJSON(data)
        const text = obj?.text ?? (typeof obj === 'string' ? obj : data)
        onEvent('final', text)
        slog(`final #${finalCount} (len ${String(text).length})`)
        return
      }

      if (evt === 'done' || (evt === 'message_end')) {
        // Algunos backends emiten 'done' extra; no abortamos por si siguen más mensajes.
        slog('done/message_end recibido (continuamos por si hay más eventos)')
        return
      }

      if (evt === 'error') {
        const obj = safeJSON(data) ?? data
        slog('error evt payload:', obj)
        onEvent('error', obj)
        return
      }

      // Comentarios/heartbeats (líneas que comienzan con ":") y otros eventos desconocidos -> ignore
    } finally {
      // Reset para el siguiente evento
      eventName = ''
      dataLines.length = 0
    }
  }

  const processChunk = (text: string) => {
    if (!text) return
    // Procesa char a char para soportar CRLF y cortes arbitrarios
    for (let i = 0; i < text.length; i++) {
      const ch = text[i]
      if (ch === '\n') {
        const line = lineBuf.endsWith('\r') ? lineBuf.slice(0, -1) : lineBuf
        lineBuf = ''

        if (line === '') {
          // Fin de evento (línea en blanco)
          if (dataLines.length > 0 || eventName) emit()
        } else if (line.startsWith(':')) {
          // comentario/heartbeat -> ignorar
        } else if (line.startsWith('event:')) {
          eventName = line.slice(6).trim()
        } else if (line.startsWith('data:')) {
          // Conserva todo lo que hay tras "data:" (quitamos SOLO un espacio inicial si existe)
          dataLines.push(line.slice(5).replace(/^\s/, ''))
        } else if (line.startsWith('id:') || line.startsWith('retry:')) {
          // soportado por el spec; no lo usamos
        } else {
          // Línea desconocida: por compat, la tratamos como data “implícita”
          dataLines.push(line)
        }
      } else {
        lineBuf += ch
      }
    }
  }
  // =======================

  ;(async () => {
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const txt = decoder.decode(value, { stream: true })
        processChunk(txt)
      }
    } catch (e) {
      slog('read error (posible abort o cierre):', e)
    } finally {
      // Si el stream terminó sin \n final, procesa la última línea
      if (lineBuf.length) processChunk('\n')
      // Si quedó un evento sin cerrar, emitirlo
      if (dataLines.length || eventName) emit()
      slog('stream closed. stats:', { frames: frameCount, tokens: tokenCount, finals: finalCount })
    }
  })()

  return () => {
    slog('abort() llamado por el cliente')
    controller.abort()
  }
}

function safeJSON(s: string): any | null {
  try { return JSON.parse(s) } catch { return null }
}
async function safeText(r: Response) {
  try { return await r.text() } catch { return '' }
}
function sample(s: string, max = 60) {
  if (!s) return '""'
  const clean = s.replace(/\s+/g, ' ')
  return clean.length > max ? `"${clean.slice(0, max)}…" (${clean.length})` : `"${clean}"`
}
