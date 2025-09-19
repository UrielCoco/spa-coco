import React from 'react';
import { useItinerary } from '@/store/itinerary.store';

export default function ExtrasCard() {
  const extras = useItinerary((s) => s.itinerary.extras);

  const keys = Object.keys(extras ?? {});
  return (
    <div className="rounded-md border border-zinc-600/40 p-3">
      <div className="mb-2 font-semibold">Extras</div>
      {keys.length === 0 ? (
        <p className="text-sm opacity-70">Sin extras por ahora.</p>
      ) : (
        <ul className="list-inside list-disc text-sm">
          {keys.map((k) => (
            <li key={k}>
              <span className="opacity-70">{k}: </span>
              <span>{String((extras as any)[k])}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
