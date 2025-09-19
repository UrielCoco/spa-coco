// src/hooks/useAssistantStream.ts
/* eslint-disable no-console */
import { useCallback, useRef, useState } from 'react'
import { useAssistantDebug } from '@/store/assistantDebug.store'   // ✅ import estático

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
      try {
        addEvent({ kind: kind as any, data, runId, threadId })
      } catch (e) {
        console.warn('[assistantDebug] tap failed:', e)
      }
    },
    [addEvent]
  )

  const parseSSE = (buf: string): { event: string; data: any }[] => {
    const out: { event: string; data: any }[] = []
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
      try { out.push({ event, data: JSON.parse(dataStr) }) }
      catch { out.push({ event, data: { value: dataStr } }) }
    }
    return out
  }

  // 👇 Usa BASE=/api (tu var) y compone el endpoint /spa-chat
  const BASE = (import.meta.env.VITE_ASSISTANT_BASE_URL as string) || '/api'
  const ENDPOINT = `${BASE.replace(/\/$/, '')}/spa-chat`

  async function start(
    payload: { messages: Message[] },
    cb: UseAssistantStream['start'] extends (...args: infer _A) => any ? Parameters<UseAssistantStream['start']>[1] : never = {}
  ) {
    if (readingRef.current) console.warn('[useAssistantStream] otro stream estaba activo; continuamos…')

    const lastUser = payload.messages.at(-1)?.content ?? ''
    tap('response.start', { message: lastUser })

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

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

    const ensurePlaceholder = () => {
      if (createdPlaceholder) return
      createdPlaceholder = true
      cb?.ensureAssistantPlaceholder?.()
    }

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const end = buffer.lastIndexOf('\n\n')
        if (end < 0) continue
        const chunk = buffer.slice(0, end + 2)
        buffer = buffer.slice(end + 2)

        const evs = parseSSE(chunk)
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
              cb?.onDelta?.(val)
              ensurePlaceholder()
              cb?.appendAssistantText?.(val)
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

              // Hook opcional por si existe window.CV.mergeItinerary
              try {
                if (parsed?.partial) {
                  const CV = (window as any).CV
                  if (CV?.mergeItinerary) CV.mergeItinerary(parsed)
                }
              } catch (e) {
                console.error('[mergeItinerary] error:', e)
              }
              break
            }
            case 'done': {
              const finalText = String(data?.text ?? '')
              cb?.onDone?.(finalText)
              if (finalText) {
                ensurePlaceholder()
                cb?.finalizeAssistantMessage?.(finalText)
              }
              break
            }
            case 'error': {
              cb?.onError?.(data)
              break
            }
            default: {
              const val = typeof data?.value === 'string' ? data.value : ''
              if (val) {
                gotAnyText = true
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
      tap('response.completed', {})
      force()
    }
  }

  return { start }
}
