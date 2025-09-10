import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useItinerary } from "@/store/itinerary.store"
import { Ship, Plane, TrainFront, Car, Footprints } from "lucide-react"

export default function TransportCard() {
  const transports = useItinerary(s => s.itinerary.transports || [])

  const groups = {
    plane: [] as any[],
    train: [] as any[],
    car: [] as any[],
    van: [] as any[],
    yacht: [] as any[],
    helicopter: [] as any[],
    walk: [] as any[],
    other: [] as any[],
  }
  for (const t of transports) {
    const k = (t?.mode as keyof typeof groups) || "other"
    ;(groups[k] || groups.other).push(t)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transportes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(groups).map(([k, arr]) =>
          arr.length ? <Block key={k} kind={k} items={arr} /> : null
        )}
        {transports.length === 0 && <p className="opacity-70">Aún no hay transportes registrados.</p>}
      </CardContent>
    </Card>
  )
}

function Block({ kind, items }: { kind: string; items: any[] }) {
  const Icon = kind === "plane" ? Plane : kind === "train" ? TrainFront : kind === "yacht" ? Ship : kind === "walk" ? Footprints : Car
  return (
    <div className="rounded-2xl border border-black/10 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={18} className="opacity-70" />
        <div className="font-semibold capitalize">{kind}</div>
      </div>
      <ul className="space-y-2">
        {items.map((t, i) => (
          <li key={i} className="text-sm">
            <span className="font-medium">{t.from?.name || "—"}</span> → <span className="font-medium">{t.to?.name || "—"}</span>
            {t.etaMins ? <span className="opacity-70"> · {t.etaMins} mins</span> : null}
            {t.notes ? <div className="opacity-70">{t.notes}</div> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
