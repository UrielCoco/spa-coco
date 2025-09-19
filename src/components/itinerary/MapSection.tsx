import React from 'react';
import { useItinerary } from '@/store/itinerary.store';

export default function MapSection() {
  const originCity = useItinerary((s) => s.itinerary.summary.originCity);
  const returnCity = useItinerary((s) => s.itinerary.summary.returnCity);

  return (
    <div className="rounded-md border border-zinc-600/40 p-3">
      <div className="mb-2 font-semibold">Mapa</div>
      <div className="text-sm opacity-80">
        Origen: — ({originCity ?? '—'}) • Retorno: — ({returnCity ?? '—'})
      </div>
      <div className="mt-2 text-xs opacity-60">
        (Aquí podría ir un mapa embebido; por ahora mostramos metadatos.)
      </div>
    </div>
  );
}
