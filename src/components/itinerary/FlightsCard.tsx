import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useItinerary } from "@/store/itinerary.store"
import { ArrowRightLeft, Clock } from "lucide-react"

export default function FlightsCard() {
  const { flights } = useItinerary (s => s.itinerary)

  const noFlights = !flights?.originCountry && !flights?.returnCountry

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vuelos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {noFlights ? (
          <p className="opacity-70">
            No se han seleccionado vuelos. Si decides no adquirirlos con nosotros, lo indicaremos aquí.
          </p>
        ) : (
          <>
            <div className="grid md:grid-cols-4 gap-3 items-start">
              <KV label="Origen (Country)" value={flights.originCountry || "—"} />
              <KV label="Origen (City)" value={flights.originCity || "—"} />
              <KV label="Retorno (Country)" value={flights.returnCountry || "—"} />
              <KV label="Retorno (City)" value={flights.returnCity || "—"} />
            </div>

            <Leg label="Departure" data={flights.outbound} />
            <Leg label="Return" data={flights.inbound} />
          </>
        )}
      </CardContent>
    </Card>
  )
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 p-3 border border-black/10">
      <div className="text-xs opacity-60">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}

function Leg({ label, data }: { label: string; data?: any }) {
  if (!data) return null
  const duration = inferDuration(data?.depTime, data?.arrTime)
  return (
    <div className="rounded-2xl border border-black/10 p-3">
      <div className="text-sm font-semibold mb-2">{label}</div>
      <div className="grid md:grid-cols-4 gap-2 items-center">
        <div><span className="text-xs opacity-60">Airline</span><div className="font-medium">{data.airline || "—"}</div></div>
        <div><span className="text-xs opacity-60">Code</span><div className="font-medium">{data.code || "—"}</div></div>
        <div><span className="text-xs opacity-60">From → To</span><div className="flex items-center gap-2">
          <span className="font-medium">{data.from || "—"}</span>
          <ArrowRightLeft size={16} className="opacity-60" />
          <span className="font-medium">{data.to || "—"}</span>
        </div></div>
        <div className="flex items-center gap-2">
          <Clock size={16} className="opacity-60" />
          <div className="text-sm">
            {data.depTime || "—"} → {data.arrTime || "—"}
            {duration ? <span className="opacity-70"> · {duration}</span> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function inferDuration(dep?: string, arr?: string) {
  // espera dep/arr como HH:mm (mismo día). Si no, omitimos.
  if (!dep || !arr) return null
  const [dh, dm] = dep.split(":").map(Number)
  const [ah, am] = arr.split(":").map(Number)
  if ([dh, dm, ah, am].some(v => Number.isNaN(v))) return null
  let mins = (ah * 60 + am) - (dh * 60 + dm)
  if (mins < 0) mins += 24 * 60
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}
