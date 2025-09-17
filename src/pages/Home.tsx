// src/pages/Home.tsx
import React, { useState } from 'react'
import ExportBar from '@/components/itinerary/ExportBar'
import ItineraryPanel from '@/components/itinerary/ItineraryPanel'
import ItineraryJsonView from '@/components/itinerary/ItineraryJsonView'
import AssistantResponsesView from '@/debug/AssistantResponsesView'



// AJUSTA este import si tu chat se llama diferente
import ChatPanel from '@/components/chat/ChatPanel'

export default function Home() {
  const [showJson, setShowJson] = useState(false)

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Top Bar */}
      <header className="h-16 border-b bg-white flex items-center px-4 gap-3">
        <div className="font-medium">New Trip</div>

        <div className="ml-auto flex items-center gap-2">
          <ExportBar />
          <button
            className="border rounded-2xl h-10 px-3 hover:bg-gray-50 transition"
            onClick={() => setShowJson(v => !v)}
            title={showJson ? 'Mostrar interfaz gráfica' : 'Mostrar JSON'}
          >
            {showJson ? 'UI' : 'JSON'}
          </button>
        </div>
      </header>

      {/* Main: 3 columnas */}
      <main className="flex-1 min-h-0">
        <div className="h-full w-full grid grid-cols-[420px,1fr,480px]">
          {/* Izquierda: Chat */}
          <aside className="border-r bg-white/50 h-[calc(100vh-64px)] overflow-auto">
            <ChatPanel />
          </aside>

          {/* Centro: Itinerario con toggle UI/JSON */}
          <section className="h-[calc(100vh-64px)] overflow-auto">
            {showJson ? <ItineraryJsonView /> : <ItineraryPanel />}
          </section>

          {/* Derecha: Respuestas crudas del Assistant */}
          <aside className="border-l bg-white h-[calc(100vh-64px)] overflow-auto">
            <AssistantResponsesView />
          </aside>
        </div>
      </main>
    </div>
  )
}
