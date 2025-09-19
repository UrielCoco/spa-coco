import React from 'react'
import { useItineraryStore, Itinerary } from '@/store/itinerary.store'

type Flight = NonNullable<Itinerary['flights']>[number]

export default function FlightsCard() {
  const flights = useItineraryStore((s) => (s.itinerary.flights ?? [])) as Flight[]

  return (
    <div className="p-4 border rounded-xl">
      <div className="font-medium mb-2">Vuelos</div>
      {flights.length === 0 ? (
        <div className="text-sm text-neutral-500">Aún no hay vuelos.</div>
      ) : (
        <ul className="space-y-2">
          {flights.map((f: Flight, i: number) => (
            <li key={i} className="text-sm border rounded-lg p-3">
              <div className="font-medium">
                {(f as any)?.from?.code ?? (f as any)?.from ?? '---'} →
                {(f as any)?.to?.code ? ' ' + (f as any)?.to?.code : ' ' + ((f as any)?.to ?? '---')}
              </div>
              <div className="text-neutral-600">
                {(f as any)?.airline ?? '—'} · {(f as any)?.number ?? '—'} · {(f as any)?.date ?? '—'}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
