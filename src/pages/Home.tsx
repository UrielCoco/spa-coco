// src/pages/Home.tsx
import React, { useState } from 'react'

// Si usas shadcn/ui Tabs, deja estos imports.
// Si tu proyecto usa otro sistema de tabs o no usa tabs aquí,
// puedes eliminar este bloque y renderizar directamente el panel.
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'

import ExportBar from '@/components/itinerary/ExportBar'
import ItineraryPanel from '@/components/itinerary/ItineraryPanel'
import ItineraryJsonView from '@/components/itinerary/ItineraryJsonView'

// Si manejas internacionalización, puedes reactivar esto y el selector más abajo
// import { useTranslation } from 'react-i18next'

export default function Home() {
  // const { i18n } = useTranslation()
  const [showJson, setShowJson] = useState(false)

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Header / Top Bar */}
      <header className="h-16 border-b bg-white flex items-center px-4 gap-3">
        {/* Título o logo */}
        <div className="font-medium">New Trip</div>

        {/* Acciones (Export / JSON toggle / Idioma opcional) */}
        <div className="ml-auto flex items-center gap-2">
          <ExportBar />

          <button
            className="border rounded-2xl h-10 px-3 hover:bg-gray-50 transition"
            onClick={() => setShowJson(v => !v)}
            title={showJson ? 'Mostrar interfaz gráfica' : 'Mostrar JSON'}
          >
            {showJson ? 'UI' : 'JSON'}
          </button>

          {/* Selector de idioma opcional
          <select
            className="border rounded-2xl h-10 px-3"
            value={i18n.language}
            onChange={e => i18n.changeLanguage(e.target.value)}
          >
            <option value="es">ES</option>
            <option value="en">EN</option>
          </select>
          */}
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 min-h-0">
        {/* Si ya usas tabs en esta página, puedes dejarlos.
            Si no, puedes eliminar el Tabs wrapper y renderizar el panel directamente. */}
        <Tabs defaultValue="itinerary" className="h-full">
          <div className="h-12 border-b bg-white flex items-center px-4">
            <TabsList>
              <TabsTrigger value="itinerary">Itinerario</TabsTrigger>
              {/* Si tienes otras pestañas, actívalas */}
              {/* <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="map">Mapa</TabsTrigger> */}
            </TabsList>
          </div>

          <TabsContent value="itinerary" className="h-[calc(100vh-4rem-3rem)]">
            <div className="h-full overflow-auto">
              {showJson ? <ItineraryJsonView /> : <ItineraryPanel />}
            </div>
          </TabsContent>

          {/* Pestañas extra (opcional)
          <TabsContent value="chat" className="h-[calc(100vh-4rem-3rem)]">
            <ChatPanel />
          </TabsContent>

          <TabsContent value="map" className="h-[calc(100vh-4rem-3rem)]">
            <MapPanel />
          </TabsContent>
          */}
        </Tabs>
      </main>
    </div>
  )
}
