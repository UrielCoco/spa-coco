import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useItinerary } from '@/store/itinerary.store'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAutosave } from '@/hooks/useAutosave'
import { useTranslation } from 'react-i18next'

const schema = z.object({
  tripTitle: z.string().min(1),
  overview: z.string().min(1),
  budgetEstimate: z.coerce.number().optional(),
})

export default function SummaryCard() {
  const { t, i18n } = useTranslation('itinerary')
  const it = useItinerary(s => s.itinerary)
  const replace = useItinerary(s => s.replace)
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      tripTitle: it.meta.tripTitle || '',
      overview: it.summary.overview || '',
      budgetEstimate: it.summary.budgetEstimate as any,
    }
  })
  useAutosave(form.watch(), 'autosave:summary')

  const onSubmit = form.handleSubmit(values => {
    replace({ ...it, meta: { ...it.meta, tripTitle: values.tripTitle }, summary: { ...it.summary, overview: values.overview, budgetEstimate: values.budgetEstimate } })
  })

  return (
    <Card className="print-card">
      <CardHeader><CardTitle>{it.labels?.summary || t('summary')}</CardTitle></CardHeader>
      <CardContent>
        <form onBlur={onSubmit} onSubmit={(e)=>{e.preventDefault(); onSubmit()}} className="grid md:grid-cols-3 gap-3">
          <div className="md:col-span-1">
            <label className="text-xs">Title</label>
            <Input {...form.register('tripTitle')} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs">{t('overview')}</label>
            <Textarea {...form.register('overview')} />
          </div>
          <div className="md:col-span-1">
            <label className="text-xs">{t('budget')}</label>
            <Input type="number" step="0.01" {...form.register('budgetEstimate')} />
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
