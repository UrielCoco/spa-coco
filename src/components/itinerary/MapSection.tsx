import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { useEffect, useMemo } from "react"
import { useItinerary } from "@/store/itinerary.store"

// logo en /public
const logoUrl = "/logo-coco-volare.png"

// Ícono dorado
const goldIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='#D4AF37' stroke='black' stroke-width='0.5'><circle cx='12' cy='12' r='10'/></svg>`
    ),
  iconSize: [28, 28],
  iconAnchor: [14, 28],
})

export default function MapSection() {
  const itinerary = useItinerary(s => s.itinerary)

  const markers = useMemo(() => {
    const pts: [number, number][] = []
    // actividades
    for (const d of itinerary.days || []) {
      for (const a of d.activities || []) {
        const c = a?.location?.coords
        if (Array.isArray(c) && c.length === 2) pts.push([c[0], c[1]])
      }
    }
    return pts
  }, [itinerary.days])

  const lines = useMemo(() => {
    const arr: [number, number][][] = []
    for (const t of itinerary.transports || []) {
      const a = t?.from?.coords
      const b = t?.to?.coords
      if (a && b) arr.push([a as [number, number], b as [number, number]])
    }
    return arr
  }, [itinerary.transports])

  const center: [number, number] = markers[0] || [19.4326, -99.1332] // CDMX fallback

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapa</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative h-[360px] rounded-2xl overflow-hidden">
          <MapContainer center={center} zoom={12} className="h-full w-full">
            {/* Positron = blanco/negro; se ve elegante con dorado */}
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
            {markers.map((p, i) => <Marker key={i} position={p} icon={goldIcon} />)}
            {lines.map((ln, i) => (
              <Polyline
                key={i}
                positions={ln}
                color="#D4AF37"
                weight={4}
                opacity={0.8}
              />
            ))}
            <FitBounds pts={markers} lines={lines} />
          </MapContainer>

          {/* Logo overlay */}
          <img src={logoUrl} alt="Logo" className="absolute left-3 bottom-3 h-8 opacity-80 pointer-events-none" />
        </div>
      </CardContent>
    </Card>
  )
}

function FitBounds({ pts, lines }: { pts: [number, number][]; lines: [number, number][][] }) {
  const map = useMap()
  useEffect(() => {
    const all: [number, number][] = [...pts]
    for (const l of lines) { all.push(...l) }
    if (all.length === 0) return
    const b = L.latLngBounds(all.map(p => L.latLng(p[0], p[1])))
    map.fitBounds(b, { padding: [40, 40] })
  }, [pts, lines, map])
  return null
}
