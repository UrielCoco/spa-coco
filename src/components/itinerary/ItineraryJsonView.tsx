import React from 'react'
import { useItineraryStore, Itinerary } from '@/store/itinerary.store'

export default function ItineraryJsonView() {
  // Tipamos explícitamente para evitar "implicit any" en algunos tsconfig estrictos
  const itinerary: Itinerary = useItineraryStore((s) => s.itinerary)

  return (
    <div className="p-4">
      <pre className="text-xs leading-5 whitespace-pre-wrap">
        {JSON.stringify(itinerary, null, 2)}
      </pre>
    </div>
  )
}
