"use client";

import React from "react";
import ResizableSplit from "@/components/layout/ResizableSplit";
import ChatPanel from "@/components/chat/ChatPanel";
import ExportBar from "@/components/itinerary/ExportBar";
import RightLogsPane from "@/components/layout/RightLogsPane";

/**
 * Layout general desktop:
 *  - Izquierda: Chat
 *  - Derecha: Split (Centro JSON / Derecha Logs)
 * En móvil tu stack/tabs siguen aplicando (este layout afecta sobre todo desktop).
 */
export default function Home() {
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
          // Split A: Chat (izquierda) | RightPane (derecha)
          defaultRatio={0.33}
          storageKey="ui:split:left"
          left={
            <div className="h-full border rounded overflow-hidden bg-background">
              <ChatPanel />
            </div>
          }
          right={<RightLogsPane />}
        />
      </main>
    </div>
  );
}
