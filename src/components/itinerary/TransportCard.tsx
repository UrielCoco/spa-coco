import React from 'react';
import { useItinerary } from '@/store/itinerary.store';
import type { Transport } from '@/types/itinerary';

export default function TransportCard() {
  const transports = useItinerary((s) => s.itinerary.transports);

  return (
    <div className="rounded-md border border-zinc-600/40 p-3">
      <div className="mb-2 font-semibold">Transportes</div>
      {transports.length === 0 ? (
        <p className="text-sm opacity-70">Sin transportes agregados.</p>
      ) : (
        <ul className="space-y-2">
          {transports.map((t: Transport, idx: number) => (
            <li key={idx} className="rounded bg-zinc-900/30 p-2 text-sm">
              {t.kind ?? 'transfer'} • {t.from ?? '—'} → {t.to ?? '—'} • {t.date ?? 's/f'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
