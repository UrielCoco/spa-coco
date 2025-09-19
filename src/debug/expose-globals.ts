import { useItinerary } from "@/store/itinerary.store";

declare global {
  interface Window {
    useItinerary?: typeof useItinerary;
  }
}

if (typeof window !== "undefined") {
  window.useItinerary = useItinerary;
}
