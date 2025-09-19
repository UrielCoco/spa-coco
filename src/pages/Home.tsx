"use client";

import React from "react";
import ChatPanel from "@/components/chat/ChatPanel";
import ItineraryJsonView from "@/components/itinerary/ItineraryJsonView";
import ExportBar from "@/components/itinerary/ExportBar";
import ResizableSplit from "@/components/layout/ResizableSplit";

/**
 * Layout con 2 divisores:
 * - Split A: Izquierda (Chat)  |  Derecha (Split B)
 * - Split B: Centro (JSON)     |  Derecha (Eventos/Logs)
 *
 * En móvil ya usas tabs/stack: este layout afecta principalmente desktop.
 */
export default function Home() {
  const RightPane = (
    <ResizableSplit
      // Split B: JSON (centro) | Eventos (derecha)
      defaultRatio={0.6}
      storageKey="ui:split:right"
      left={
        <div className="h-full border rounded overflow-hidden bg-background">
          {/* Centro: SIEMPRE el JSON del itinerario */}
          <ItineraryJsonView />
        </div>
      }
      right={
        <div className="h-full border rounded overflow-hidden bg-background">
          {/* Derecha: “Respuestas del Assistant (completas)” o logs de streaming */}
          <div className="h-full flex flex-col">
            <div className="px-3 py-2 border-b font-medium">Respuestas del Assistant (completas)</div>
            <div id="assistant-events" className="flex-1 overflow-auto p-3 text-sm text-muted-foreground">
              <div>Sin eventos (aún)…</div>
            </div>
          </div>
        </div>
      }
    />
  );

  return (
    <div className="h-screen w-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-3 gap-3 border-b">
        <h1 className="text-lg font-semibold">New Trip</h1>
        <ExportBar />
      </header>

      {/* Cuerpo con 2 divisores anidados */}
      <main className="flex-1 min-h-0">
        <ResizableSplit
          // Split A: Chat (izq) | RightPane (der)
          defaultRatio={0.33}
          storageKey="ui:split:left"
          left={
            <div className="h-full border rounded overflow-hidden bg-background">
              {/* Izquierda: Chat con burbujas */}
              <ChatPanel />
            </div>
          }
          right={RightPane}
        />
      </main>
    </div>
  );
}
