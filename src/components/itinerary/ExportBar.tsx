import React, { useRef } from "react";
import { useItinerary, downloadJSON } from "@/store/itinerary.store";

export default function ExportBar() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const loadFromJSON = useItinerary((s) => s.loadFromJSON);

  const onPickFile = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    // Reemplaza todo el itinerario con el JSON cargado
    loadFromJSON(text, "replace");
    // Limpia el input para poder volver a cargar el mismo archivo si hace falta
    e.target.value = "";
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={onFile}
      />
      <button
        type="button"
        className="px-3 py-1 rounded border"
        onClick={onPickFile}
        title="Cargar JSON"
      >
        Cargar JSON
      </button>

      <button
        type="button"
        className="px-3 py-1 rounded border"
        onClick={() => downloadJSON()}
        title="Descargar JSON"
      >
        Descargar JSON
      </button>
    </div>
  );
}
