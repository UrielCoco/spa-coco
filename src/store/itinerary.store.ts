// src/store/itinerary.store.ts
import { create } from 'zustand';
import { Itinerary } from '@/types/itinerary';
import { DeepPartial, deepMerge } from '@/services/parsers';

export type ItineraryStore = {
  itinerary: Itinerary;

  /** Reemplaza todo el estado con un JSON (objeto o string) */
  loadFromJSON: (json: string | Partial<Itinerary>) => void;

  /** Aplica un diff parcial (deep merge) */
  applyPartial: (partial: DeepPartial<Itinerary>) => void;

  /** Devuelve un JSON listo para exportar */
  toJSON: () => Itinerary;

  /** Limpia a valores por defecto */
  reset: () => void;
};

const defaultItinerary: Itinerary = {
  meta: { tripTitle: 'New Trip' },
  summary: {},
  flights: [],
  days: [],
  transports: [],
  extras: {},
  lights: {},
};

export const useItineraryStore = create<ItineraryStore>((set, get) => ({
  itinerary: defaultItinerary,

  loadFromJSON: (json) => {
    try {
      const obj: Partial<Itinerary> = typeof json === 'string' ? JSON.parse(json) : json;
      const next = deepMerge(defaultItinerary, obj as any);
      set({ itinerary: next });
    } catch (e) {
      console.error('loadFromJSON error:', e);
      // si falla, no toca el estado
    }
  },

  applyPartial: (partial) => {
    const next = deepMerge(get().itinerary, partial);
    set({ itinerary: next });
  },

  toJSON: () => get().itinerary,

  reset: () => set({ itinerary: defaultItinerary }),
}));

/**
 * Alias con selector tipado. Uso:
 *   const flights = useItinerary(s => s.itinerary.flights)
 *   const apply = useItinerary(s => s.applyPartial)
 */
export function useItinerary<T>(selector: (s: ItineraryStore) => T): T {
  return useItineraryStore(selector);
}
