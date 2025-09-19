import React from "react";
import { useItinerary } from "@/store/itinerary.store";

export default function TransportCard() {
  const transports = useItinerary((s) => s.itinerary.transports ?? []);

  return (
    <section className="p-3">
      <h3 className="mb-2 text-sm font-semibold">Transportes</h3>
      {Array.isArray(transports) && transports.length > 0 ? (
        <ul className="space-y-2">
          {transports.map((t: any, i: number) => (
            <li key={i} className="rounded border p-2 text-sm">
              {t?.mode || t?.type || "Transporte"} — {t?.from} → {t?.to}
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-muted-foreground">Sin transportes agregados.</div>
      )}
    </section>
  );
}
