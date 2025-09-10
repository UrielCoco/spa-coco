import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useItinerary } from "@/store/itinerary.store"

export default function SummaryCard() {
  const itinerary = useItinerary((s: any) => s.itinerary)

  const meta = itinerary.meta
  const summary = itinerary.summary
  const images = (summary as any)?.images as string[] | undefined

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <Info label="Título del viaje" value={meta.tripTitle || "—"} />
          <Info label="Fechas" value={formatDates(meta.startDate, meta.endDate)} />
          <Info label="Personas" value={meta.travelers ? String(meta.travelers) : "—"} />
          <Info label="Moneda" value={meta.currency || "—"} />
        </div>

        <div>
          <div className="text-sm font-medium opacity-70 mb-1">Descripción</div>
          <p className="leading-relaxed">{summary?.overview || "—"}</p>
        </div>

        {Array.isArray(summary?.highlights) && summary!.highlights!.length > 0 && (
          <div>
            <div className="text-sm font-medium opacity-70 mb-1">Highlights</div>
            <ul className="list-disc pl-5 space-y-1">
              {summary!.highlights!.map((h: string, i: number) => <li key={i}>{h}</li>)}
            </ul>
          </div>
        )}

        {typeof summary?.budgetEstimate === "number" && (
          <Info label="Presupuesto estimado" value={formatCurrency(summary!.budgetEstimate, meta.currency)} />
        )}

        {Array.isArray(images) && images.length > 0 && (
          <div>
            <div className="text-sm font-medium opacity-70 mb-2">Galería</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {images.map((src, idx) => (
                <img key={idx} src={src} alt="" className="rounded-xl object-cover aspect-video" />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 p-3 border border-black/10">
      <div className="text-xs opacity-60">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}
function formatDates(a?: string, b?: string) {
  if (!a && !b) return "—"
  if (a && !b) return a
  if (!a && b) return b
  return `${a} → ${b}`
}
function formatCurrency(n: number, code?: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: code || "USD", maximumFractionDigits: 0 }).format(n)
  } catch {
    return `${n} ${code || ""}`.trim()
  }
}
