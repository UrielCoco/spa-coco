import React from "react";
import { useItinerary } from "@/store/itinerary.store";

export default function SummaryCard() {
  const meta = useItinerary((s) => s.itinerary.meta ?? {});
  const summary = useItinerary((s) => s.itinerary.summary ?? {});
  const title = (meta as any)?.tripTitle || "New Trip";
  const overview =
    (summary as any)?.overview || (summary as any)?.notes || "Sin overview.";

  return (
    <section className="p-3">
      <h3 className="mb-2 text-sm font-semibold">Resumen</h3>
      <div className="text-sm">
        <div className="text-slate-500">Título: {title}</div>
        <div className="mt-1 whitespace-pre-wrap">{overview}</div>
      </div>
    </section>
  );
}
