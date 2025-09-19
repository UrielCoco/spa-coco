import React from "react";
import { useItinerary } from "@/store/itinerary.store";

export default function DayPlanCard() {
  const days = useItinerary((s) => s.itinerary.days ?? []);

  return (
    <section className="p-3">
      <h3 className="mb-2 text-sm font-semibold">Plan por día</h3>
      {Array.isArray(days) && days.length > 0 ? (
        <ol className="space-y-2">
          {days.map((d: any, i: number) => (
            <li key={i} className="rounded border p-2">
              <div className="text-xs text-slate-500">Día {i + 1}</div>
              <div className="text-sm whitespace-pre-wrap">
                {d?.title || d?.name || d?.summary || "Sin título"}
              </div>
              {d?.items && Array.isArray(d.items) && (
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {d.items.map((it: any, j: number) => (
                    <li key={j}>{it?.label || it?.name || it?.time || "Actividad"}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <div className="text-sm text-muted-foreground">Sin días cargados todavía.</div>
      )}
    </section>
  );
}
