// src/components/itinerary/ItineraryJsonView.tsx
import { useItinerary } from '@/store/itinerary.store'
import { useToolDebug } from '@/store/toolDebug.store'

export default function ItineraryJsonView() {
  const it = useItinerary(s => s.itinerary)
  const raw = useToolDebug(s => s.lastToolRaw)
  const parsed = useToolDebug(s => s.lastToolParsed)

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
    <div className="h-full p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm opacity-70">Vista: JSON completo del itinerario</span>
        <button className="ml-auto border rounded-2xl h-10 px-3 hover:bg-gray-50" onClick={download}>
          Descargar JSON
        </button>
      </div>

      {/* Secciones colapsables */}
      <Section title="meta" data={it.meta} defaultOpen />
      <Section title="summary" data={it.summary} defaultOpen />
      <Section title="flights" data={it.flights} />
      <Section title="days" data={it.days} />
      <Section title="transports" data={it.transports} />
      <Section title="extras" data={it.extras} />
      <Section title="labels" data={it.labels} />

      {/* Último payload crudo/parseado del Assistant (útil cuando llega parcial por sección) */}
      {(raw || parsed) && (
        <div className="mt-6 border rounded-lg p-3 bg-neutral-50">
          <div className="text-sm font-medium mb-2">Último payload del Assistant</div>
          {raw && (
            <>
              <div className="text-xs opacity-70 mb-1">raw</div>
              <pre className="text-xs whitespace-pre-wrap">{raw}</pre>
            </>
          )}
          {parsed && (
            <>
              <div className="text-xs opacity-70 mt-3 mb-1">parsed</div>
              <pre className="text-xs">{JSON.stringify(parsed, null, 2)}</pre>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, data, defaultOpen = false }: { title: string; data: any; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="mb-3 border rounded-lg">
      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium bg-neutral-100">
        {title} {data == null ? <span className="opacity-50">(vacío)</span> : null}
      </summary>
      <pre className="p-3 overflow-auto text-xs">{JSON.stringify(data ?? null, null, 2)}</pre>
    </details>
  )
}
