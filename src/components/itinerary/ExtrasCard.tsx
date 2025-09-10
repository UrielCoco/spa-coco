import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useItinerary } from "@/store/itinerary.store"

export default function ExtrasCard() {
  const extras = useItinerary(s => s.itinerary.extras || [])
  return (
    <Card>
      <CardHeader>
        <CardTitle>Extras</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {extras.length === 0 && <p className="opacity-70">No hay servicios adicionales aún.</p>}
        {extras.map((e, i) => (
          <div key={i} className="rounded-xl border border-black/10 p-3">
            <div className="text-sm font-semibold capitalize">{e.type.replace("_", " ")}</div>
            <div className="font-medium">{e.title}</div>
            {e.description && <p className="text-sm mt-1">{e.description}</p>}
            <div className="text-sm opacity-70 mt-1">
              {e.price ? `Precio: ${e.price}` : null}
              {e.schedule?.date ? ` · ${e.schedule.date}` : null}
              {e.schedule?.time ? ` ${e.schedule.time}` : null}
              {e.location?.name ? ` · ${e.location.name}` : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
