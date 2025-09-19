import React from "react";
import ChatPanel from "@/components/chat/ChatPanel";
import ItineraryJsonView from "@/components/itinerary/ItineraryJsonView";
import ExportBar from "@/components/itinerary/ExportBar";

export default function Home() {
  return (
    <div className="h-screen w-screen grid grid-cols-[320px_1fr_360px] grid-rows-[auto_1fr] gap-3 p-3">
      {/* Header */}
      <div className="col-span-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">New Trip</h1>
        <ExportBar />
      </div>

      {/* Izquierda: Chat */}
      <div className="row-start-2 border rounded overflow-hidden">
        <ChatPanel />
      </div>

      {/* Centro: SIEMPRE el JSON del itinerario */}
      <div className="row-start-2 border rounded overflow-hidden">
        <ItineraryJsonView />
      </div>

      {/* Derecha: aquí puedes seguir mostrando “Respuestas del Assistant (completas)” */}
      <div className="row-start-2 border rounded p-3 text-sm text-muted-foreground">
        <div>Sin eventos (aún)…</div>
      </div>
    </div>
  );
}
