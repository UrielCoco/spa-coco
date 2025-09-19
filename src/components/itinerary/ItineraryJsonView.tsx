import React from "react";
import { useItinerary } from "@/store/itinerary.store";

/**
 * Muestra SOLO el JSON del itinerario desde el store.
 * No renderiza ni mensajes ni eventos del chat.
 */
export default function ItineraryJsonView() {
  const itinerary = useItinerary((s) => s.itinerary);

  return (
    <pre
      style={{
        width: "100%",
        height: "100%",
        margin: 0,
        padding: 12,
        overflow: "auto",
        background: "#0b1020",
        color: "#cde3ff",
        borderRadius: 8,
        fontSize: 12,
        lineHeight: 1.4,
      }}
    >
{JSON.stringify(itinerary, null, 2)}
    </pre>
  );
}
