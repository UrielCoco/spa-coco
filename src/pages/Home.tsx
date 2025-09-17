// src/pages/Home.tsx
import React, { useState } from 'react'

// Si ya usas shadcn/ui Tabs para las secciones del itinerario (Resumen, Vuelos, Días…),
// mantenemos esos tabs dentro de ItineraryPanel. Aquí solo hacemos el layout 2 columnas.
import ExportBar from '@/components/itinerary/ExportBar'
import ItineraryPanel from '@/components/itinerary/ItineraryPanel'
import ItineraryJsonView from '@/components/itinerary/ItineraryJsonView'

// 🔁 Ajusta esta ruta/nombre según tu proyecto
import ChatPanel from '@/components/chat/ChatPanel'

export default function Home() {
  const [showJson, setShowJson] = useState(false)

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Top Bar */}
      <header className="h-16 border-b bg-white flex items-center px-4 gap-3">
        {/* Título / logo */}
        <div className="font-medium">New Trip</div>

        {/* Acciones a la derecha */}
        <div className="ml-auto flex items-center gap-2">
          <ExportBar />

          <button
            className="border rounded-2xl h-10 px-3 hover:bg-gray-50 transition"
            onClick={() => setShowJson(v => !v)}
            title={showJson ? 'Mostrar interfaz gráfica' : 'Mostrar JSON'}
          >
            {showJson ? 'UI' : 'JSON'}
          </button>

          {/* Si tienes selector de idioma, ponlo aquí */}
          {/* <select className="border rounded-2xl h-10 px-3">
              <option value="es">ES</option>
              <option value="en">EN</option>
            </select> */}
        </div>
      </header>

      {/* Main: 2 columnas */}
      <main className="flex-1 min-h-0">
        <div className="h-full w-full flex">
          {/* Izquierda: CHAT (se mantiene siempre visible) */}
          <aside className="w-[420px] min-w-[360px] max-w-[520px] border-r bg-white/50 h-[calc(100vh-64px)] overflow-auto">
            <ChatPanel />
          </aside>

          {/* Derecha: Itinerario con toggle UI / JSON */}
          <section className="flex-1 h-[calc(100vh-64px)] overflow-auto">
            {showJson ? <ItineraryJsonView /> : <ItineraryPanel />}
          </section>
        </div>
      </main>
    </div>
  )
}
