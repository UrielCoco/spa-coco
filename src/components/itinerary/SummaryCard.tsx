import React from 'react';
import { useItinerary } from '@/store/itinerary.store';

export default function SummaryCard() {
  const summary = useItinerary((s) => s.itinerary.summary);

  return (
    <div className="rounded-md border border-zinc-600/40 p-3">
      <div className="mb-2 font-semibold">Resumen</div>
      {summary?.overview ? (
        <p className="text-sm opacity-90">{summary.overview}</p>
      ) : (
        <p className="text-sm opacity-70">Sin overview.</p>
      )}
    </div>
  );
}
