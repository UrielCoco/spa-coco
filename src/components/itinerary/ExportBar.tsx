import { Button } from '@/components/common/Button'
import { useItinerary } from '@/store/itinerary.store'

export default function ExportBar() {
  const it = useItinerary(s => s.itinerary)
  const replace = useItinerary(s => s.replace)

  const saveJson = () => {
    const blob = new Blob([JSON.stringify(it, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = (it.meta.tripTitle || 'itinerary') + '.json'
    a.click()
  }

  const openJson = () => {
    const inp = document.createElement('input')
    inp.type = 'file'; inp.accept = 'application/json'
    inp.onchange = () => {
      const file = inp.files?.[0]; if (!file) return
      file.text().then(txt => replace(JSON.parse(txt)))
    }
    inp.click()
  }

  const exportPdf = () => window.print()

  const newIt = () => replace({ meta: { tripTitle: 'New Trip' }, summary: { overview: '' }, flights: { originCountry: '', originCity: '', returnCountry: '', returnCity: '' }, days: [], transports: [], extras: [] })

  return (
    <div className="no-print flex gap-2">
      <Button variant="outline" onClick={newIt}>Nuevo</Button>
      <Button variant="outline" onClick={openJson}>Abrir JSON</Button>
      <Button variant="outline" onClick={saveJson}>Guardar JSON</Button>
      <Button onClick={exportPdf}>Exportar PDF</Button>
    </div>
  )
}
