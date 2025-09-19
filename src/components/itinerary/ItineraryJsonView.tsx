// apps/web/src/components/itinerary/ItineraryJsonView.tsx
import React from 'react'
import { useItinerary } from '@/store/itinerary.store'

export default function ItineraryJsonView() {
  const itinerary = useItinerary((s) => s.itinerary)

  return (
    <div className="h-full w-full overflow-auto bg-neutral-950 text-neutral-50">
      <pre className="text-xs md:text-sm p-3 leading-snug">
        {JSON.stringify(itinerary, null, 2)}
      </pre>
    </div>
  )
}
