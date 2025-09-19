import React from 'react';
import { useItinerary } from '@/store/itinerary.store';
import type { DayPlan } from '@/types/itinerary';

export default function DayPlanCard() {
  const days = useItinerary((s) => s.itinerary.days);

  return (
    <div className="rounded-md border border-zinc-600/40 p-3">
      <div className="mb-2 font-semibold">Plan por día</div>
      {days.length === 0 ? (
        <p className="text-sm opacity-70">Sin días cargados todavía.</p>
      ) : (
        <div className="space-y-3">
          {days.map((d: DayPlan, idx: number) => (
            <div key={idx} className="rounded bg-zinc-900/30 p-2 text-sm">
              <div className="mb-1 font-medium">
                {d.date ?? 's/f'} • {d.city ?? '—'} {d.hotel ? `• Hotel: ${d.hotel}` : ''}
              </div>
              {d.activities && d.activities.length > 0 ? (
                <ul className="list-inside list-disc space-y-1">
                  {d.activities.map((a, i) => (
                    <li key={i}>
                      {a.time ? `${a.time} • ` : ''}
                      {a.title ?? 'Actividad'}
                      {a.private ? ' (priv.)' : ''}
                      {a.location ? ` — ${a.location}` : ''}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="opacity-70">Sin actividades.</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
