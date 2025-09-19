import React from 'react'
import { useItineraryStore, Itinerary } from '@/store/itinerary.store'

type Extras = Itinerary['extras']

export default function ExtrasCard() {
  const extras: Extras = useItineraryStore((s) => s.itinerary.extras)

  return (
    <div className="p-4 border rounded-xl">
      <div className="font-medium mb-2">Extras</div>
      {!extras || Object.keys(extras ?? {}).length === 0 ? (
        <div className="text-sm text-neutral-500">Sin extras por ahora.</div>
      ) : (
        <pre className="text-xs whitespace-pre-wrap">
          {JSON.stringify(extras, null, 2)}
        </pre>
      )}
    </div>
  )
}
