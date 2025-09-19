import React from 'react';
import { useItinerary } from '@/store/itinerary.store';
import { downloadJSON } from '@/services/io';

export default function ExportBar() {
  const toJSON = useItinerary((s) => s.toJSON);
  const loadFromJSON = useItinerary((s) => s.loadFromJSON);
  const reset = useItinerary((s) => s.reset);

  const onDownload = () => downloadJSON(toJSON(), 'itinerary.json');

  const onUpload = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    loadFromJSON(text);
    ev.target.value = '';
  };

  return (
    <div className="flex items-center gap-2">
      <button
        className="rounded-md border border-zinc-600/40 px-3 py-1 text-sm hover:bg-zinc-800/30"
        onClick={onDownload}
      >
        Descargar JSON
      </button>

      <label className="rounded-md border border-zinc-600/40 px-3 py-1 text-sm hover:bg-zinc-800/30 cursor-pointer">
        Cargar JSON
        <input type="file" accept="application/json" className="hidden" onChange={onUpload} />
      </label>

      <button
        className="rounded-md border border-red-600/40 px-3 py-1 text-sm text-red-300 hover:bg-red-900/20"
        onClick={reset}
      >
        Reiniciar
      </button>
    </div>
  );
}
