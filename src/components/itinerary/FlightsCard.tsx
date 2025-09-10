import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useItinerary } from '@/store/itinerary.store'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useTranslation } from 'react-i18next'

const schema = z.object({
  originCountry: z.string().min(1),
  originCity: z.string().min(1),
  returnCountry: z.string().min(1),
  returnCity: z.string().min(1),
})

export default function FlightsCard() {
  const { t } = useTranslation('itinerary')
  const it = useItinerary(s => s.itinerary)
  const replace = useItinerary(s => s.replace)
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: it.flights
  })

  const onSubmit = form.handleSubmit(values => {
    replace({ ...it, flights: { ...it.flights, ...values } })
  })

  return (
    <Card className="print-card">
      <CardHeader><CardTitle>{it.labels?.flights || t('flights')}</CardTitle></CardHeader>
      <CardContent>
        <form onBlur={onSubmit} className="grid md:grid-cols-4 gap-3">
          <div><label className="text-xs">{t('origin')} (Country)</label><Input {...form.register('originCountry')} /></div>
          <div><label className="text-xs">{t('origin')} (City)</label><Input {...form.register('originCity')} /></div>
          <div><label className="text-xs">{t('return')} (Country)</label><Input {...form.register('returnCountry')} /></div>
          <div><label className="text-xs">{t('return')} (City)</label><Input {...form.register('returnCity')} /></div>
        </form>
      </CardContent>
    </Card>
  )
}
