import React from 'react'
import { useItineraryStore, Itinerary } from '@/store/itinerary.store'

// Evita indexar sobre tipo que puede ser undefined
type Day = NonNullable<Itinerary['days']>[number]

export default function DayPlanCard() {
  const days = useItineraryStore((s) => (s.itinerary.days ?? [])) as Day[]

  if (days.length === 0) {
    return (
      <div className="p-4 border rounded-xl">
        <div className="font-medium mb-1">Plan por día</div>
        <div className="text-sm text-neutral-500">Sin días cargados todavía.</div>
      </div>
    )
  }

  return (
    <div className="p-4 border rounded-xl">
      <div className="font-medium mb-2">Plan por día</div>
      <ul className="space-y-2">
        {days.map((d: Day, i: number) => (
          <li key={i} className="p-3 rounded-lg border">
            <div className="text-sm font-semibold">
              Día {i + 1}{' '}
              {d?.date ? (
                <span className="text-neutral-500 font-normal">— {d.date}</span>
              ) : null}
            </div>
            {d?.title ? (
              <div className="text-sm">{d.title}</div>
            ) : (
              <div className="text-sm text-neutral-500">Sin título</div>
            )}
            {Array.isArray(d?.items) && d.items.length > 0 ? (
              <ul className="mt-2 list-disc pl-5 text-sm">
                {d.items.map((it: unknown, j: number) => (
                  <li key={j}>{String((it as any)?.name ?? (it as any)?.title ?? 'Actividad')}</li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
