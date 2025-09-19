import React from "react";
import { useItinerary } from "@/store/itinerary.store";

export default function ExtrasCard() {
  const extras = useItinerary((s) => s.itinerary.extras ?? []);

  return (
    <section className="p-3">
      <h3 className="mb-2 text-sm font-semibold">Extras</h3>
      {Array.isArray(extras) && extras.length > 0 ? (
        <ul className="space-y-2">
          {extras.map((e: any, i: number) => (
            <li key={i} className="rounded border p-2 text-sm">
              {e?.label || e?.name || e?.title || "Extra"}
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-muted-foreground">Sin extras por ahora.</div>
      )}
    </section>
  );
}
