import React from 'react'
import { useItineraryStore, Itinerary } from '@/store/itinerary.store'

export default function SummaryCard() {
  const summary: Itinerary['summary'] = useItineraryStore((s) => s.itinerary.summary)
  const meta: Itinerary['meta'] = useItineraryStore((s) => s.itinerary.meta)

  return (
    <div className="p-4 border rounded-xl">
      <div className="font-medium mb-2">Resumen</div>
      <div className="text-sm">
        <div className="mb-1">
          <span className="text-neutral-500">Título:</span> {meta?.tripTitle || '—'}
        </div>
        <div className="whitespace-pre-wrap">{summary?.overview || 'Sin overview.'}</div>
      </div>
    </div>
  )
}
