import React from 'react'
import { useItineraryStore, Itinerary } from '@/store/itinerary.store'

type Transport = NonNullable<Itinerary['transports']>[number]

export default function TransportCard() {
  const transports = useItineraryStore((s) => (s.itinerary.transports ?? [])) as Transport[]

  return (
    <div className="p-4 border rounded-xl">
      <div className="font-medium mb-2">Transportes</div>
      {transports.length === 0 ? (
        <div className="text-sm text-neutral-500">Sin transportes agregados.</div>
      ) : (
        <ul className="space-y-2">
          {transports.map((t: Transport, i: number) => (
            <li key={i} className="text-sm border rounded-lg p-3">
              <div className="font-medium">{(t as any)?.type ?? '—'}</div>
              <div className="text-neutral-600">
                {(t as any)?.date ?? '—'} · {(t as any)?.from ?? '—'} → {(t as any)?.to ?? '—'}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
