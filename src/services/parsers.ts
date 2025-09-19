// Si aquí sólo necesitabas leer el estado o tipos, importa desde el nuevo store:
import { useItinerary } from "@/store/itinerary.store";

// Ejemplo mínimo de uso seguro (ajústalo a tu lógica real):
export function getCurrentItinerary() {
  const it = useItinerary.getState().itinerary;
  return it;
}
