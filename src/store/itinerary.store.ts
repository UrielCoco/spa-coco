import { create } from 'zustand'
import type { Itinerary } from '@/types/itinerary'

const empty: Itinerary = {
  meta: { tripTitle: 'New Trip' },
  summary: { overview: '' },
  flights: { originCountry: '', originCity: '', returnCountry: '', returnCity: '' },
  days: [], transports: [], extras: []
}

type State = {
  itinerary: Itinerary
  set: (p: Partial<Itinerary>) => void
  reset: () => void
  replace: (all: Itinerary) => void
}

export const useItinerary = create<State>((set, get) => ({
  itinerary: empty,
  set: (p) => set({ itinerary: { ...get().itinerary, ...p } }),
  reset: () => set({ itinerary: empty }),
  replace: (all) => set({ itinerary: all })
}))
