import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useItinerary } from "@/store/itinerary.store"
import { ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react"
import { useRef } from "react"

export default function DayPlanCard() {
  const days = useItinerary(s => s.itinerary.days || [])
  const scroller = useRef<HTMLDivElement>(null)

  const scrollBy = (dx: number) => scroller.current?.scrollBy({ left: dx, behavior: "smooth" })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Días</CardTitle>
        <div className="flex gap-2">
          <button className="rounded-full p-2 border border-black/10 hover:bg-black/5" onClick={() => scrollBy(-320)} aria-label="Anterior">
            <ChevronLeft />
          </button>
          <button className="rounded-full p-2 border border-black/10 hover:bg-black/5" onClick={() => scrollBy(320)} aria-label="Siguiente">
            <ChevronRight />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={scroller} className="flex gap-4 overflow-x-auto pb-1 snap-x">
          {days.map((d, i) => (
            <DayCol key={i} day={d} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function DayCol({ day }: { day: any }) {
  const acts = [...(day.activities || [])].sort(sortByTime)

  return (
    <div className="snap-start min-w-[280px] max-w-[280px] rounded-2xl border border-black/10 bg-muted/30">
      <div className="px-3 py-2 border-b border-black/10">
        <div className="text-xs opacity-60">Día {day.dayIndex}{day.date ? ` · ${day.date}` : ""}</div>
        <div className="text-sm font-medium">{[day.city, day.country].filter(Boolean).join(", ") || "—"}</div>
      </div>
      <div className="max-h-[260px] overflow-auto p-3 space-y-2">
        {acts.length === 0 ? (
          <div className="opacity-60 text-sm">Sin actividades</div>
        ) : acts.map((a, idx) => <ActivityItem key={idx} a={a} />)}
      </div>
    </div>
  )
}

function ActivityItem({ a }: { a: any }) {
  const when = [a.time, a.durationMins ? `· ${a.durationMins}m` : null].filter(Boolean).join(" ")
  const place = a?.location?.name || a?.location?.address
  return (
    <div className="rounded-xl bg-white p-3 shadow-soft border border-black/10">
      <div className="text-sm font-semibold">{a.title}</div>
      <div className="text-xs opacity-70 flex items-center gap-2">
        <Clock size={14} /> {when || "—"}
      </div>
      <div className="text-xs opacity-70 flex items-center gap-2">
        <MapPin size={14} /> {place || "—"}
      </div>
      {a.description && <p className="mt-1 text-sm">{a.description}</p>}
      {a.tag && <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-gold-100 text-black border border-gold-300">{a.tag}</span>}
    </div>
  )
}

function sortByTime(a: any, b: any) {
  const ta = parseTime(a?.time)
  const tb = parseTime(b?.time)
  return ta - tb
}
function parseTime(t?: string) {
  if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return 9999
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}
