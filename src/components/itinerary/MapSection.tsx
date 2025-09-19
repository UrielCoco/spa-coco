import React from 'react'
import { useItineraryStore, Itinerary } from '@/store/itinerary.store'

export default function MapSection() {
  const lights: Itinerary['lights'] = useItineraryStore((s) => s.itinerary.lights)

  return (
    <div className="p-4 border rounded-xl">
      <div className="font-medium mb-2">Mapa</div>
      <div className="text-sm text-neutral-600">
        Origen: {lights?.originCity || '—'} ({lights?.originCountry || '—'}) ·
        Retorno: {lights?.returnCity || '—'} ({lights?.returnCountry || '—'})
      </div>
      <div className="mt-3 text-xs text-neutral-500">
        (Aquí podría ir un mapa embebido; por ahora mostramos metadatos.)
      </div>
    </div>
  )
}
