import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useItinerary } from '@/store/itinerary.store'
import { useTranslation } from 'react-i18next'

export default function TransportCard() {
  const { t } = useTranslation('itinerary')
  const it = useItinerary(s => s.itinerary)

  return (
    <Card className="print-card">
      <CardHeader><CardTitle>{it.labels?.transports || t('transports')}</CardTitle></CardHeader>
      <CardContent>
        <ul className="text-sm space-y-2">
          {(it.transports||[]).map((leg, idx) => (
            <li key={idx} className="flex justify-between">
              <div>{leg.mode.toUpperCase()} · {leg.from.name} → {leg.to.name}</div>
              {leg.etaMins ? <div>{leg.etaMins} mins</div> : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
