// apps/web/src/components/chat/ChatPanel.tsx
'use client'

import React, { useCallback, useRef, useState } from 'react'
import { upsertItineraryFromPartial } from '@/store/itinerary.store'

type SpaEvent =
  | { event: 'thread.run.created' | 'thread.run.queued' | 'thread.run.in_progress' | 'thread.run.completed'; data?: any }
  | { event: 'response.completed'; data?: any }
  | {
      event: 'tool_result'
      data: {
        id: string
        tool_name: string
        arguments?: any // llega como string (JSON escapado) o como objeto según tu backend
        _event?: string // a veces viene duplicado por compatibilidad
      }
    }
  | {
      event: 'thread.run.step.delta' | 'thread.run.step.in_progress' | 'thread.run.step.created'
      data?: any
    }

function safeParse<T = any>(maybeJson: any): T | undefined {
  if (maybeJson == null) return undefined
  if (typeof maybeJson === 'object') return maybeJson as T
  if (typeof maybeJson === 'string') {
    const s = maybeJson.trim()
    if (!s) return undefined
    try {
      return JSON.parse(s) as T
    } catch {
      // puede venir fragmentado por tokens; lo ignoramos aquí
      return undefined
    }
  }
  return undefined
}

async function* readLines(stream: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder()
  const reader = stream.getReader()
  let buf = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      let idx: number
      // asumimos \n como separador por línea
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx).trim()
        buf = buf.slice(idx + 1)
        if (line) yield line
      }
    }
    if (buf.trim()) yield buf.trim()
  } finally {
    reader.releaseLock()
  }
}

export default function ChatPanel() {
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const handleSend = useCallback(async () => {
    if (!input.trim()) return
    setLoading(true)
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    try {
      const res = await fetch('/api/spa-chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: input }],
        }),
        headers: { 'Content-Type': 'application/json' },
        signal: ac.signal,
      })

      if (!res.ok || !res.body) {
        console.error('SPA chat failed', res.status, await res.text())
        setLoading(false)
        return
      }

      for await (const line of readLines(res.body)) {
        // Cada línea debería ser un JSON: { event: string, data: {...} }
        let evt: SpaEvent | undefined
        try {
          evt = JSON.parse(line)
        } catch {
          // algunas líneas no serán JSON; puedes mostrarlas en un panel raw si quieres
          continue
        }

        // --- 🔥 Manejo de tool_result: upsert_itinerary ---
        if (evt?.event === 'tool_result' && evt.data?.tool_name === 'upsert_itinerary') {
          const rawArgs = evt.data.arguments
          const parsed = safeParse<{ partial?: any }>(rawArgs)
          const partial = parsed?.partial ?? parsed
          if (partial && typeof partial === 'object') {
            try {
              upsertItineraryFromPartial(partial)
              ;(window as any).cvToolDebug?.onToolEnd?.('upsert_itinerary', 'OK')
            } catch (e) {
              console.error('No pude aplicar parcial al store', e, partial)
              ;(window as any).cvToolDebug?.onToolEnd?.('upsert_itinerary', 'APPLY_ERROR')
            }
          } else {
            // En caso extremo, algunos backends envían el diff directo sin envoltura {partial}
            const maybeDirectObj = safeParse<any>(rawArgs)
            if (maybeDirectObj && typeof maybeDirectObj === 'object') {
              upsertItineraryFromPartial(maybeDirectObj)
            }
          }
          continue
        }

        // (Opcional) aquí puedes manejar otros eventos del stream si los necesitas:
        // - response.completed
        // - thread.run.* para estados de UI
        // - thread.run.step.delta -> útil solo para panel raw/debug
      }
    } catch (err) {
      if ((err as any)?.name !== 'AbortError') {
        console.error('Error consumiendo stream', err)
      }
    } finally {
      setLoading(false)
    }
  }, [input])

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-2">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex gap-2"
        >
          <input
            className="flex-1 rounded border px-3 py-2"
            placeholder="Escribe tu mensaje…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? 'Enviando…' : 'Enviar'}
          </button>
        </form>
      </div>
      {/* Tu panel de mensajes iría aquí si lo tienes */}
      <div className="flex-1 overflow-auto p-3 text-sm text-neutral-400">
        <p>Los updates del itinerario se verán en el panel de la derecha/centro.</p>
      </div>
    </div>
  )
}
