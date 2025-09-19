import React from "react";
import ResizableSplit from "@/components/layout/ResizableSplit";
import ItineraryJsonView from "@/components/itinerary/ItineraryJsonView";
import AssistantResponsesView from "@/debug/AssistantResponsesView";

/**
 * Divide el panel derecho en:
 * - Centro: JSON del itinerario (estado vivo del store)
 * - Derecha: Logs/eventos del assistant para diagnóstico
 */
export default function RightLogsPane() {
  return (
    <ResizableSplit
      defaultRatio={0.58}
      storageKey="ui:split:center"
      left={
        <div className="h-full border rounded overflow-hidden bg-background">
          <ItineraryJsonView />
        </div>
      }
      right={
        <div className="h-full border rounded overflow-hidden bg-background">
          <AssistantResponsesView />
        </div>
      }
    />
  );
}
