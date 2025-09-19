/**
 * Utilidades que usa el flujo del Assistant para aplicar “diffs parciales”
 * al store. Centralizado aquí para reutilizar en tools o handlers.
 */
import { useItineraryStore, Itinerary } from '@/store/itinerary.store'

/** Aplica un JSON completo (string u objeto) al store */
export function loadItineraryFromUnknown(data: string | Itinerary) {
  useItineraryStore.getState().loadFromJSON(data as any)
}

/** Mezcla un parcial (diff) al store */
export function mergeItineraryPartial(partial: Partial<Itinerary>) {
  useItineraryStore.getState().mergeItinerary(partial)
}
