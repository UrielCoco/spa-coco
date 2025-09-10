import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { Itinerary, DayPlan, Activity, TransportLeg, ExtraService, LabelMap } from "@/types/itinerary"

type State = {
  itinerary: Itinerary
  lastUpdated?: string
  setItinerary: (it: Itinerary) => void
  mergeItinerary: (partial: Partial<Itinerary>) => void
  reset: () => void
  loadFromJSON: (json: Itinerary) => void
}

const initialItinerary = (): Itinerary => ({
  labels: undefined,
  meta: {
    tripTitle: "New Trip",
    travelers: undefined,
    currency: undefined,
    startDate: undefined,
    endDate: undefined,
    notes: undefined,
  },
  summary: { overview: "" },
  flights: {
    originCountry: "",
    originCity: "",
    returnCountry: "",
    returnCity: "",
  },
  days: [],
  transports: [],
  extras: [],
})

/** --- Helpers de merge “inteligente” --- */
function mergeLabels(a?: LabelMap, b?: LabelMap): LabelMap | undefined {
  if (!a && !b) return undefined
  return { ...(a || {}), ...(b || {}) }
}

function uniqBy<T>(arr: T[], key: (x: T) => string): T[] {
  const m = new Map<string, T>()
  for (const x of arr) m.set(key(x), x)
  return Array.from(m.values())
}

function mergeActivities(base: Activity[] = [], incoming: Activity[] = []): Activity[] {
  // Clave por título + hora (lo más estable que tenemos sin IDs)
  const key = (a: Activity) => `${(a.time || "").trim()}|${(a.title || "").trim().toLowerCase()}`
  const map = new Map<string, Activity>(base.map(a => [key(a), { ...a }]))

  for (const act of incoming) {
    const k = key(act)
    if (map.has(k)) {
      const prev = map.get(k)!
      map.set(k, {
        ...prev,
        ...act,
        location: { ...(prev.location || {}), ...(act.location || {}) },
      })
    } else {
      map.set(k, { ...act })
    }
  }
  // Orden por hora ascendente (si falta hora, al final)
  const toMinutes = (t?: string) => {
    if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return 1e9
    const [h, m] = t.split(":").map(Number)
    return h * 60 + m
  }
  return Array.from(map.values()).sort((x, y) => toMinutes(x.time) - toMinutes(y.time))
}

function mergeDays(base: DayPlan[] = [], incoming: DayPlan[] = []): DayPlan[] {
  const byIndex = new Map<number, DayPlan>(base.map(d => [d.dayIndex, { ...d, activities: [...(d.activities || [])] }]))

  for (const p of incoming) {
    const curr = byIndex.get(p.dayIndex)
    if (curr) {
      byIndex.set(p.dayIndex, {
        ...curr,
        ...p,
        activities: mergeActivities(curr.activities || [], p.activities || []),
      })
    } else {
      byIndex.set(p.dayIndex, {
        ...p,
        activities: mergeActivities([], p.activities || []),
      })
    }
  }
  return Array.from(byIndex.values()).sort((a, b) => a.dayIndex - b.dayIndex)
}

function mergeTransports(base: TransportLeg[] = [], incoming: TransportLeg[] = []): TransportLeg[] {
  const key = (t: TransportLeg) =>
    `${t.mode}|${t.from?.name || ""}|${t.to?.name || ""}|${(t.from?.coords || []).join(",")}|${(t.to?.coords || []).join(",")}`
  return uniqBy<TransportLeg>([...(base || []), ...(incoming || [])], key)
}

function mergeExtras(base: ExtraService[] = [], incoming: ExtraService[] = []): ExtraService[] {
  const key = (e: ExtraService) => `${e.type}|${(e.title || "").toLowerCase()}|${e.schedule?.date || ""}|${e.schedule?.time || ""}`
  // incoming gana sobre base
  const map = new Map<string, ExtraService>()
  for (const e of base) map.set(key(e), e)
  for (const e of incoming) map.set(key(e), { ...(map.get(key(e)) || {}), ...e })
  return Array.from(map.values())
}

function deepMergeItinerary(base: Itinerary, partial: Partial<Itinerary>): Itinerary {
  const out: Itinerary = { ...base }

  if (partial.labels) out.labels = mergeLabels(base.labels, partial.labels)

  if (partial.meta) out.meta = { ...base.meta, ...partial.meta }

  if (partial.summary) {
    out.summary = {
      ...base.summary,
      ...partial.summary,
      highlights: partial.summary.highlights
        ? uniqBy([...(base.summary.highlights || []), ...partial.summary.highlights], x => x)
        : base.summary.highlights,
    }
  }

  if (partial.flights) {
    out.flights = {
      ...base.flights,
      ...partial.flights,
      outbound: { ...(base.flights.outbound || {}), ...(partial.flights.outbound || {}) },
      inbound: { ...(base.flights.inbound || {}), ...(partial.flights.inbound || {}) },
    }
  }

  if (partial.days) out.days = mergeDays(base.days, partial.days)

  if (partial.transports) out.transports = mergeTransports(base.transports || [], partial.transports)

  if (partial.extras) out.extras = mergeExtras(base.extras || [], partial.extras)

  return out
}

/** --- Store --- */
export const useItinerary = create<State>()(
  persist(
    (set, get) => ({
      itinerary: initialItinerary(),
      lastUpdated: undefined,

      setItinerary: (it) =>
        set({ itinerary: it, lastUpdated: new Date().toISOString() }),

      mergeItinerary: (partial) =>
        set(() => {
          const current = get().itinerary
          const merged = deepMergeItinerary(current, partial)
          return { itinerary: merged, lastUpdated: new Date().toISOString() }
        }),

      reset: () => set({ itinerary: initialItinerary(), lastUpdated: new Date().toISOString() }),

      loadFromJSON: (json) => set({ itinerary: json, lastUpdated: new Date().toISOString() }),
    }),
    {
      name: "itinerary.v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // migraciones si cambian campos en el futuro
      migrate: (state: any, _version) => state,
      partialize: (s) => ({ itinerary: s.itinerary, lastUpdated: s.lastUpdated }),
    }
  )
)
