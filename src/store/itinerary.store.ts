import { create } from 'zustand'

/** Tipos muy flexibles para no pelear con el JSON del asistente */
export type AnyRec = Record<string, any>

export type Itinerary = {
  meta?: AnyRec
  summary?: AnyRec
  flights?: AnyRec[]
  days?: AnyRec[]
  transports?: AnyRec[]
  extras?: AnyRec[]
  lights?: AnyRec
}

const EMPTY: Itinerary = {
  meta: { tripTitle: 'New Trip' },
  summary: {},
  flights: [],
  days: [],
  transports: [],
  extras: [],
  lights: {},
}

function deepMerge<T extends AnyRec>(base: T, patch: AnyRec): T {
  const out: AnyRec = Array.isArray(base) ? [...(base as any)] : { ...base }
  for (const [k, v] of Object.entries(patch ?? {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof out[k] === 'object' && !Array.isArray(out[k])) {
      out[k] = deepMerge(out[k], v)
    } else {
      out[k] = v
    }
  }
  return out as T
}

type State = {
  itinerary: Itinerary
  /** bandera opcional para tu UI */
  streaming: boolean

  /** Reemplaza todo el itinerario desde un objeto o string JSON */
  loadFromJSON: (src: string | Itinerary) => void

  /** Mezcla (deep-merge) un parcial dentro del itinerario actual */
  mergeItinerary: (partial: Partial<Itinerary>) => void

  /** Limpia al estado base */
  reset: () => void

  /** (opcional) marca streaming */
  setStreaming: (v: boolean) => void
}

export const useItineraryStore = create<State>((set, get) => ({
  itinerary: EMPTY,
  streaming: false,

  loadFromJSON: (src) => {
    let obj: Itinerary
    if (typeof src === 'string') {
      try {
        obj = JSON.parse(src)
      } catch (e) {
        console.error('JSON inválido en loadFromJSON', e)
        return
      }
    } else {
      obj = src
    }
    set({ itinerary: deepMerge(EMPTY, obj || {}) })
  },

  mergeItinerary: (partial) => {
    const current = get().itinerary
    set({ itinerary: deepMerge(current, partial || {}) })
  },

  reset: () => set({ itinerary: EMPTY }),

  setStreaming: (v) => set({ streaming: v }),
}))
