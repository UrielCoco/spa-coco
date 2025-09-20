/* eslint-disable no-console */
import { useCallback, useRef, useState } from 'react'
import { useAssistantDebug } from '@/store/assistantDebug.store'

export type Message = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface UseAssistantStream {
  start: (
    payload: { messages: Message[] },
    cb?: {
      ensureAssistantPlaceholder?: () => void
      appendAssistantText?: (chunk: string) => void
      finalizeAssistantMessage?: (finalText: string) => void
      onDelta?: (chunk: string) => void
      onToolDelta?: (id: string, name: string | undefined, delta: string) => void
      onToolCompleted?: (id: string, name: string | undefined, rawArgs: string, parsed: any) => void
      onDone?: (finalText: string) => void
      onError?: (err: any) => void
      onDebug?: (data: any) => void
    }
  ) => Promise<void>
}

export function useAssistantStream(): UseAssistantStream {
  const readingRef = useRef(false)
  const [_, setVersion] = useState(0)
  const force = () => setVersion((v) => v + 1)

  const { addEvent } = useAssistantDebug()
  const tap = useCallback(
    (kind: any, data?: any, runId?: string, threadId?: string) => {
      try { addEvent({ kind: kind as any, data, runId, threadId }) }
      catch (e) { console.warn('[assistantDebug] tap failed:', e) }
    },
    [addEvent]
  )

  // ======== helpers de parseo SSE y extracción de texto ========
  const parseSSE = (buf: string): { event: string; data: any; raw: string }[] => {
    const out: { event: string; data: any; raw: string }[] = []
    const blocks = buf.split('\n\n')
    for (const block of blocks) {
      if (!block.trim()) continue
      let event = 'message'
      const dataLines: string[] = []
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
      }
      const dataStr = dataLines.join('\n')
      if (!dataStr) continue
      try { out.push({ event, data: JSON.parse(dataStr), raw: block }) }
      catch { out.push({ event, data: { value: dataStr }, raw: block }) }
    }
    return out
  }

  function extractTextChunk(data: any): string {
    const candidates = [
      data?.value,
      data?.text,
      data?.delta,
      data?.output_text,
      data?.output?.[0]?.content?.[0]?.text?.value,
      data?.content?.[0]?.text?.value,
      data?.message?.content?.[0]?.text?.value,
    ]
    for (const c of candidates) {
      if (typeof c === 'string' && c.length) return c
      if (Array.isArray(c)) {
        const joined = c.filter((v) => typeof v === 'string').join('')
        if (joined) return joined
      }
    }
    return ''
  }

  function extractFinalText(data: any): string {
    const whole =
      data?.text ??
      data?.value ??
      data?.output_text ??
      (Array.isArray(data?.output)
        ? data.output.map((o: any) =>
            (Array.isArray(o?.content) ? o.content : []).map((p: any) => p?.text?.value || '').join('')
          ).join('')
        : '') ??
      (Array.isArray(data?.content)
        ? data.content.map((p: any) => p?.text?.value || '').join('')
        : '') ??
      ''
    return typeof whole === 'string' ? whole : ''
  }
  // =============================================================

  // BASE=/api (tu var en Vercel) → componemos /spa-chat
  const BASE = (import.meta.env.VITE_ASSISTANT_BASE_URL as string) || '/api'
  const ENDPOINT = `${BASE.replace(/\/$/, '')}/spa-chat`

  async function start(
    payload: { messages: Message[] },
    cb: UseAssistantStream['start'] extends (...args: infer _A) => any ? Parameters<UseAssistantStream['start']>[1] : never = {}
  ) {
    if (readingRef.current) console.warn('[useAssistantStream] otro stream activo; continuamos…')

    const lastUser = payload.messages.at(-1)?.content ?? ''
    tap('response.start', { message: lastUser })

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const ct = res.headers.get('content-type') || ''

    // ---------- MODO JSON (sin SSE) ----------
    if (!ct.includes('text/event-stream')) {
      let bodyText = ''
      try {
        bodyText = await res.text()
        // 🔎 Log completo de respuesta JSON (tal cual llega)
        tap('response.json.raw', safeParseMaybe(bodyText))
      } catch (e) {
        tap('error', { message: 'No se pudo leer JSON', error: String(e) })
      }

      if (!res.ok) {
        const err = { status: res.status, message: `HTTP ${res.status}` }
        tap('error', err)
        cb?.onError?.(err)
        readingRef.current = false
        force()
        return
      }

      // 🔧 Aquí está el FIX importante:
      // intentamos texto en varias llaves, PRIORIDAD: json.message.content (lo que ya viste en logs)
      try {
        const json = JSON.parse(bodyText || '{}')

        const text =
          // 1) tu forma actual de backend (message.content)
          json?.message?.content ??
          json?.json?.message?.content ?? // por si viene anidado en "json"
          // 2) campos alternos que podrías usar en otros endpoints
          json?.assistantText ??
          json?.text ??
          json?.choices?.[0]?.message?.content ??
          // 3) string directo
          (typeof json === 'string' ? json : '') ??
          ''

        cb?.ensureAssistantPlaceholder?.()

        if (text && typeof text === 'string') {
          cb?.appendAssistantText?.(text)
          cb?.finalizeAssistantMessage?.(text)
          cb?.onDone?.(text)
          tap('response.completed', { mode: 'json', length: text.length })
        } else {
          // No hubo texto directo: registramos para diagnóstico y cerramos vacío
          tap('response.completed', { mode: 'json', length: 0 })
          cb?.onDone?.('')
        }
      } catch (e) {
        tap('error', { message: 'JSON parse error', error: String(e) })
        cb?.onDone?.('')
      } finally {
        readingRef.current = false
        force()
      }
      return
    }

    // ---------- MODO SSE ----------
    if (!res.ok || !res.body) {
      const err = { status: res.status, message: `HTTP ${res.status}` }
      tap('error', err)
      cb?.onError?.(err)
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    readingRef.current = true

    const toolBuf: Record<string, { name?: string; args: string }> = {}
    let createdPlaceholder = false
    let gotAnyText = false
    let builtText = ''

    const ensurePlaceholder = () => {
      if (createdPlaceholder) return
      createdPlaceholder = true
      cb?.ensureAssistantPlaceholder?.()
    }

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunkStr = decoder.decode(value, { stream: true })
        buffer += chunkStr

        // 🧩 Log crudo del chunk SSE (útil para diagnóstico)
        tap('sse.chunk', { raw: chunkStr })

        const end = buffer.lastIndexOf('\n\n')
        if (end < 0) continue
        const chunk = buffer.slice(0, end + 2)
        buffer = buffer.slice(end + 2)

        const evs = parseSSE(chunk)
        // 🧭 Log de bloques parseados (por evento)
        tap('sse.parsed', { blocks: evs.map(({ event, data }) => ({ event, data })) })

        for (const { event, data } of evs) {
          const mapped =
            event === 'delta' ? 'response.delta'
            : event === 'done' ? 'response.completed'
            : event.startsWith('tool_call.') ? (event === 'tool_call.completed' ? 'tool_result' : 'tool_call')
            : event

          tap(mapped, { ...data, _event: event }, data?.run_id, data?.thread_id)

          switch (event) {
            case 'delta': {
              const val = String(data?.value ?? '')
              if (!val) break
              gotAnyText = true
              builtText += val
              ensurePlaceholder()
              cb?.appendAssistantText?.(val)
              break
            }

            case 'response.output_text.delta':
            case 'message.delta': {
              const val = extractTextChunk(data)
              if (!val) break
              gotAnyText = true
              builtText += val
              ensurePlaceholder()
              cb?.appendAssistantText?.(val)
              break
            }

            case 'response.output_text.done':
            case 'message.completed': {
              const final = extractFinalText(data) || builtText
              if (final) {
                gotAnyText = true
                ensurePlaceholder()
                cb?.finalizeAssistantMessage?.(final)
              }
              break
            }

            case 'tool_call.arguments.delta': {
              const id: string = data?.id ?? 'unknown'
              const name: string | undefined = data?.name
              const d: string = String(data?.arguments?.delta ?? '')
              const b = (toolBuf[id] ||= { name, args: '' })
              if (name && !b.name) b.name = name
              b.args += d
              cb?.onToolDelta?.(id, b.name, d)
              break
            }

            case 'tool_call.completed': {
              const id: string = data?.id ?? 'unknown'
              const name: string | undefined = data?.name
              let rawArgs: string = typeof data?.arguments === 'string' ? data.arguments : ''
              const b = (toolBuf[id] ||= { name, args: '' })
              if (b.args) rawArgs = b.args
              let parsed: any = null
              try { parsed = rawArgs ? JSON.parse(rawArgs) : null } catch {}
              cb?.onToolCompleted?.(id, name, rawArgs, parsed)
              break
            }

            case 'done':
            case 'response.completed': {
              const final = extractFinalText(data) || builtText
              cb?.onDone?.(final)
              if (final) {
                ensurePlaceholder()
                cb?.finalizeAssistantMessage?.(final)
              }
              break
            }

            case 'error': {
              cb?.onError?.(data)
              break
            }

            default: {
              const val = extractTextChunk(data)
              if (val) {
                gotAnyText = true
                builtText += val
                ensurePlaceholder()
                cb?.appendAssistantText?.(val)
              } else {
                cb?.onDebug?.({ event, data })
              }
            }
          }
        }
      }
    } catch (err) {
      tap('error', { message: String(err) })
      cb?.onError?.(err)
    } finally {
      readingRef.current = false
      if (!gotAnyText) cb?.onDone?.('')
      tap('response.completed', { mode: 'sse', gotAnyText })
      force()
    }
  }

  return { start }
}

function safeParseMaybe(text: string) {
  try {
    return { ok: true, json: JSON.parse(text) }
  } catch {
    return { ok: false, text }
  }
}
