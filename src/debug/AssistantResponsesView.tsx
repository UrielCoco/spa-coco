// src/components/debug/AssistantResponsesView.tsx
import { useMemo, useState } from 'react'
import { useAssistantDebug } from '@/store/assistantDebug.store'

function formatTS(ts: number) {
  const d = new Date(ts)
  return d.toLocaleTimeString()
}

export default function AssistantResponsesView() {
  const { events, clear } = useAssistantDebug()
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<string>('all')

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const kindOk = kind === 'all' ? true : e.kind === kind
      if (!kindOk) return false
      if (!query) return true
      try {
        const hay = JSON.stringify(e.data).toLowerCase()
        return hay.includes(query.toLowerCase())
      } catch {
        return false
      }
    })
  }, [events, query, kind])

  const download = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `assistant-events-${new Date().toISOString()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b bg-white flex items-center gap-2">
        <div className="text-sm font-medium">Respuestas del Assistant (completas)</div>
        <input
          className="ml-2 border rounded-md px-2 py-1 text-sm flex-1"
          placeholder="Filtrar por texto…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="border rounded-md px-2 py-1 text-sm"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="all">Todos</option>
          <option value="response.start">response.start</option>
          <option value="response.delta">response.delta</option>
          <option value="response.output_text.delta">output_text.delta</option>
          <option value="response.output_text.done">output_text.done</option>
          <option value="response.output_item.added">output_item.added</option>
          <option value="response.completed">response.completed</option>
          <option value="message.created">message.created</option>
          <option value="message.delta">message.delta</option>
          <option value="message.completed">message.completed</option>
          <option value="tool_call">tool_call</option>
          <option value="tool_result">tool_result</option>
          <option value="debug">debug</option>
          <option value="error">error</option>
        </select>
        <button className="border rounded-md px-3 py-1 text-sm" onClick={download}>
          Descargar
        </button>
        <button className="border rounded-md px-3 py-1 text-sm" onClick={clear}>
          Limpiar
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-sm opacity-60">Sin eventos (aún)…</div>
        ) : (
          <ul className="space-y-2 p-3">
            {filtered.map((e) => (
              <li key={e.id} className="border rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-neutral-100 flex items-center gap-2">
                  <span className="text-xs tabular-nums">{formatTS(e.t)}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-white border">{e.kind}</span>
                  {e.runId ? <span className="text-xs opacity-70">run: {e.runId}</span> : null}
                  {e.threadId ? <span className="text-xs opacity-70">thread: {e.threadId}</span> : null}
                </div>
                <pre className="p-3 text-xs overflow-auto">{safeStringify(e.data)}</pre>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function safeStringify(v: any) {
  try {
    if (typeof v === 'string') return v
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

