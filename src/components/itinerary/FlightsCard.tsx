import React from "react";
import { useItinerary } from "@/store/itinerary.store";

export default function FlightsCard() {
  const flights = useItinerary((s) => s.itinerary.flights ?? []);

  return (
    <section className="p-3">
      <h3 className="mb-2 text-sm font-semibold">Vuelos</h3>
      {Array.isArray(flights) && flights.length > 0 ? (
        <ul className="space-y-2">
          {flights.map((f: any, i: number) => (
            <li key={i} className="rounded border p-2 text-sm">
              {f?.code || f?.flight || "Vuelo"} — {f?.from?.city || f?.from} → {f?.to?.city || f?.to}
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-muted-foreground">Aún no hay vuelos.</div>
      )}
    </section>
  );
}
