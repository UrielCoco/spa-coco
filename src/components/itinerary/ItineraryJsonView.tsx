// src/components/itinerary/ItineraryJsonView.tsx
import { useItinerary } from '@/store/itinerary.store'
import { useToolDebug } from '@/store/toolDebug.store'
import React from 'react'

export default function ItineraryJsonView() {
  const it = useItinerary((s) => s.itinerary)

  const { streaming, lastFunctionName, lastToolRaw, lastToolParsed, clear } =
    useToolDebug((s) => ({
      streaming: s.streaming,
      lastFunctionName: s.lastFunctionName,
      lastToolRaw: s.lastToolRaw,
      lastToolParsed: s.lastToolParsed,
      clear: s.clear,
    }))

  const download = () => {
    const blob = new Blob([JSON.stringify(it, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${it?.meta?.tripTitle || 'itinerary'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm opacity-70">Vista JSON del itinerario</span>
        <button
          className="ml-auto border rounded-2xl h-9 px-3 hover:bg-gray-50"
          onClick={download}
          title="Descargar JSON del store de itinerario"
        >
          Descargar JSON
        </button>
        <button
          className="border rounded-2xl h-9 px-3 hover:bg-gray-50"
          onClick={clear}
          title="Limpiar depuración"
        >
          Limpiar
        </button>
      </div>

      {/* JSON del store principal */}
      <Section title="itinerary (store/UI)" data={it} defaultOpen />

      {/* Depuración de tool streaming */}
      <div className="border rounded-lg">
        <div className="px-3 py-2 bg-neutral-100 text-sm font-medium flex items-center gap-2">
          Tool streaming
          {streaming ? (
            <span className="ml-2 inline-flex items-center gap-2 text-emerald-700">
              <Dot className="animate-pulse text-emerald-600" /> recibiendo…
            </span>
          ) : (
            <span className="ml-2 text-neutral-500">inactivo</span>
          )}
          {lastFunctionName ? (
            <span className="ml-auto text-xs text-neutral-500">
              función: {lastFunctionName}
            </span>
          ) : null}
        </div>

        <div className="p-3">
          <details open className="mb-3">
            <summary className="cursor-pointer select-none text-sm font-medium">
              raw (argumentos del tool-call, tal cual llegan)
            </summary>
            <pre className="mt-2 text-xs whitespace-pre-wrap">{lastToolRaw || '—'}</pre>
          </details>

          <details>
            <summary className="cursor-pointer select-none text-sm font-medium">
              parsed (último JSON que logró parsear)
            </summary>
            <pre className="mt-2 text-xs">
              {JSON.stringify(lastToolParsed ?? null, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  data,
  defaultOpen = false,
}: {
  title: string
  data: any
  defaultOpen?: boolean
}) {
  return (
    <details open={defaultOpen} className="mb-3 border rounded-lg">
      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium bg-neutral-100">
        {title} {data == null ? <span className="opacity-50">(vacío)</span> : null}
      </summary>
      <pre className="p-3 overflow-auto text-xs">{JSON.stringify(data ?? null, null, 2)}</pre>
    </details>
  )
}

function Dot(props: React.HTMLAttributes<HTMLSpanElement>) {
  return <span {...props}>●</span>
}
