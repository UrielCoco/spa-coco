import React from "react";
import { useItinerary } from "@/store/itinerary.store";

export default function ItineraryJsonView() {
  const itinerary = useItinerary((s) => s.itinerary);

  const pretty = React.useMemo(
    () => JSON.stringify(itinerary ?? {}, null, 2),
    [itinerary]
  );

  return (
    <pre
      className="w-full h-full overflow-auto p-3 text-xs"
      style={{ background: "#070d1a", color: "#dce4ff" }}
    >
      {pretty}
    </pre>
  );
}
