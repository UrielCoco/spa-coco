import { useItinerary } from '@/store/itinerary.store'
import SummaryCard from './SummaryCard'
import FlightsCard from './FlightsCard'
import DayPlanCard from './DayPlanCard'
import TransportCard from './TransportCard'
import ExtrasCard from './ExtrasCard'
import MapSection from './MapSection'

export default function ItineraryPanel() {
  const it = useItinerary(s => s.itinerary)
  return (
    <div className="p-4 space-y-4">
      <SummaryCard />
      <FlightsCard />
      <DayPlanCard />
      <TransportCard />
      <ExtrasCard />
      <MapSection />
    </div>
  )
}
