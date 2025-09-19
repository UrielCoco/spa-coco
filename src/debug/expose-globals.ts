/**
 * Expone utilidades en window para depurar desde la consola del navegador:
 *   - window.loadItinerary(jsonOrObject)
 *   - window.mergeItinerary(partial)
 *   - window.itinerary (reactivo)
 */
import { useItineraryStore } from '@/store/itinerary.store'

declare global {
  interface Window {
    loadItinerary: (src: string | object) => void
    mergeItinerary: (partial: object) => void
    itinerary: any
  }
}

// carga/mezcla programáticamente
window.loadItinerary = (src) => useItineraryStore.getState().loadFromJSON(src as any)
window.mergeItinerary = (partial) => useItineraryStore.getState().mergeItinerary(partial as any)

// espejo reactivo en window.itinerary
useItineraryStore.subscribe((s) => {
  window.itinerary = s.itinerary
})

// inicializa
window.itinerary = useItineraryStore.getState().itinerary
