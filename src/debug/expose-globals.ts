// Exponer helpers globales para probar en consola (dev/prod) sin MIME issues.
import { useItinerary } from "@/store/itinerary.store";

// 1) Define un tipo estable para el API global
type CVApi = {
  mergeItinerary: (partial: any) => void;
  resetItinerary: () => void;
  getItinerary: () => any;
};

// 2) Augment de Window con CV **no opcional** (si este archivo carga, existe)
declare global {
  interface Window {
    CV: CVApi;
  }
}

// 3) Crea el objeto completo y asígnalo de un jalón (evita {} temporales)
if (typeof window !== "undefined") {
  const api: CVApi = {
    mergeItinerary(partial: any) {
      try {
        useItinerary.getState().mergeItinerary(partial);
        console.info("[CV.mergeItinerary] OK", partial);
      } catch (e) {
        console.error("[CV.mergeItinerary] error", e);
      }
    },
    resetItinerary() {
      try {
        useItinerary.getState().reset();
        console.info("[CV.resetItinerary] OK");
      } catch (e) {
        console.error("[CV.resetItinerary] error", e);
      }
    },
    getItinerary() {
      try {
        return useItinerary.getState().itinerary;
      } catch (e) {
        console.error("[CV.getItinerary] error", e);
        return null;
      }
    },
  };

  // Asignación única y tipada
  (window as any).CV = api;
}

// 4) Vuelve este archivo un módulo para que el augmentation funcione bien
export {};
