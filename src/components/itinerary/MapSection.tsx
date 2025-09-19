import React from "react";
import { useItinerary } from "@/store/itinerary.store";

export default function MapSection() {
  const summary = useItinerary((s) => s.itinerary.summary ?? {});
  const originCity = summary?.originCity || "—";
  const returnCity = summary?.returnCity || "—";

  return (
    <section className="p-3">
      <h3 className="mb-2 text-sm font-semibold">Mapa</h3>
      <div className="text-sm">
        Origen: {originCity} — Retorno: {returnCity}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        (Aquí podría ir un mapa embebido; por ahora mostramos metadatos.)
      </div>
    </section>
  );
}
