import ResizableSplit from '@/components/layout/ResizableSplit'
import ChatPanel from '@/components/chat/ChatPanel'
import ItineraryPanel from '@/components/itinerary/ItineraryPanel'
import ExportBar from '@/components/itinerary/ExportBar'
import { useItinerary } from '@/store/itinerary.store'
import { mergeItinerary } from '@/services/parsers'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useState } from 'react'

export default function Home() {
  const { t, i18n } = useTranslation('common')
  const it = useItinerary(s => s.itinerary)
  const [tab, setTab] = useState('chat')

  const onTool = (json: any) => mergeItinerary(json)

  return (
    <div className="h-screen flex flex-col">
      <header className="h-16 border-b flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="logo" className="w-8 h-8 rounded" />
          <div className="font-semibold">{it.meta.tripTitle || t('title')}</div>
        </div>
        <div className="flex items-center gap-3">
          <ExportBar />
          <select className="border rounded-2xl h-10 px-3" value={i18n.language} onChange={e => i18n.changeLanguage(e.target.value)}>
            <option value="es">ES</option>
            <option value="en">EN</option>
          </select>
        </div>
      </header>

      {/* Desktop split */}
      <ResizableSplit
        left={<ChatPanel onTool={onTool} />}
        right={<ItineraryPanel />}
      />

      {/* Mobile tabs */}
      <div className="md:hidden h-[calc(100vh-72px)]">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="p-2"><TabsList><TabsTrigger value="chat">{t('chat')}</TabsTrigger><TabsTrigger value="itinerary">{t('itinerary')}</TabsTrigger></TabsList></div>
          <TabsContent value="chat"><div className="h-[calc(100vh-132px)]"><ChatPanel onTool={onTool} /></div></TabsContent>
          <TabsContent value="itinerary"><div className="h-[calc(100vh-132px)] overflow-auto"><ItineraryPanel /></div></TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
