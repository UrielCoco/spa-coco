import React from 'react';
import { useItinerary } from '@/store/itinerary.store';
import type { Flight } from '@/types/itinerary';

export default function FlightsCard() {
  const flights = useItinerary((s) => s.itinerary.flights);

  return (
    <div className="rounded-md border border-zinc-600/40 p-3">
      <div className="mb-2 font-semibold">Vuelos</div>
      {flights.length === 0 ? (
        <p className="text-sm opacity-70">Aún no hay vuelos.</p>
      ) : (
        <ul className="space-y-2">
          {flights.map((f: Flight, idx: number) => (
            <li key={idx} className="rounded bg-zinc-900/30 p-2 text-sm">
              {f.from} → {f.to} • {f.date ?? 's/f'} {f.airline ? `• ${f.airline}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
