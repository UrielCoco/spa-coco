import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useItinerary } from '@/store/itinerary.store'
import { useTranslation } from 'react-i18next'

export default function ExtrasCard() {
  const { t } = useTranslation('itinerary')
  const it = useItinerary(s => s.itinerary)
  return (
    <Card className="print-card">
      <CardHeader><CardTitle>{it.labels?.extras || t('extras')}</CardTitle></CardHeader>
      <CardContent>
        <ul className="text-sm space-y-2">
          {(it.extras||[]).map((ex, idx) => (
            <li key={idx} className="flex justify-between">
              <div>{ex.title}</div>
              {ex.price ? <div>${ex.price}</div> : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
