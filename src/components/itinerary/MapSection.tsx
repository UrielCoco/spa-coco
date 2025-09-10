import { useMemo, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useItinerary } from '@/store/itinerary.store'
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

export default function MapSection() {
  const it = useItinerary(s => s.itinerary)
  const [open, setOpen] = useState(true)

  const points = useMemo(() => {
    const p: [number, number][] = []
    it.days?.forEach(d => d.activities?.forEach(a => { if (a.location?.coords) p.push(a.location.coords) }))
    it.transports?.forEach(t => { if (t.from.coords) p.push(t.from.coords); if (t.to.coords) p.push(t.to.coords) })
    return p
  }, [it])

  const center = points[0] || [19.4326, -99.1332]

  return (
    <Card className="print-card">
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Mapa</CardTitle>
        <button className="text-sm underline" onClick={()=>setOpen(o=>!o)}>{open ? 'Ocultar' : 'Mostrar'}</button>
      </CardHeader>
      {open && (
        <CardContent>
          <div className="h-80 rounded-2xl overflow-hidden border">
            <MapContainer center={center as any} zoom={12} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {points.map((p, i) => <Marker key={i} position={p as any} />)}
              {(it.transports||[]).map((t, i) => (t.from.coords && t.to.coords) ? <Polyline key={i} positions={[t.from.coords as any, t.to.coords as any]} /> : null)}
            </MapContainer>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
