import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useItinerary } from '@/store/itinerary.store'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/common/Button'

export default function DayPlanCard() {
  const { t } = useTranslation('itinerary')
  const it = useItinerary(s => s.itinerary)
  const replace = useItinerary(s => s.replace)

  const addDay = () => {
    const nextIndex = (it.days?.length || 0) + 1
    replace({ ...it, days: [...(it.days||[]), { dayIndex: nextIndex, activities: [] }] })
  }

  return (
    <Card className="print-card">
      <CardHeader className="flex items-center justify-between">
        <CardTitle>{it.labels?.days || t('days')}</CardTitle>
        <Button variant="outline" onClick={addDay}>+ Day</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {(it.days||[]).map((d, idx) => (
          <div key={idx} className="rounded-2xl border p-3">
            <div className="font-medium mb-2">Day {d.dayIndex} — {d.city||''} {d.country||''}</div>
            <ul className="space-y-2">
              {(d.activities||[]).map((a, i) => (
                <li key={i} className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{a.time ? a.time + ' · ' : ''}{a.title}</div>
                    {a.description && <div className="text-xs text-gray-600">{a.description}</div>}
                  </div>
                  <div className="text-xs text-gray-500">{a.tag}</div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
