import type { Itinerary, LabelMap } from "@/types/itinerary"
import { useItinerary } from "@/store/itinerary.store"

/**
 * Fusiona un parcial de Itinerary en el store (persistente).
 * Usar SIEMPRE que llegue un tool del assistant.
 */
export function mergeItinerary(partial: Partial<Itinerary>) {
  useItinerary.getState().mergeItinerary(partial)
}

/** Si el assistant manda etiquetas de UI, se aplican dando prioridad a las nuevas */
export function extractLabels(partial: Partial<Itinerary>): LabelMap | undefined {
  return partial.labels
}
