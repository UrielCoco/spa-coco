import type { Itinerary } from '@/types/itinerary'
import { useItinerary } from '@/store/itinerary.store'

export function mergeItinerary(partial: Partial<Itinerary>): Itinerary {
  const current = useItinerary.getState().itinerary
  const merged: Itinerary = {
    ...current,
    ...partial,
    meta: { ...current.meta, ...(partial.meta||{}) },
    summary: { ...current.summary, ...(partial.summary||{}) },
    flights: { ...current.flights, ...(partial.flights||{}) },
    days: partial.days ?? current.days,
    transports: partial.transports ?? current.transports,
    extras: partial.extras ?? current.extras,
    labels: partial.labels ?? current.labels
  }
  useItinerary.getState().replace(merged)
  return merged
}

export function extractLabels(partial: Partial<Itinerary>): Record<string,string> | undefined {
  return partial.labels
}
