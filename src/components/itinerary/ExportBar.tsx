import React, { useRef } from 'react'
import { useItineraryStore } from '@/store/itinerary.store'

export default function ExportBar() {
  const fileRef = useRef<HTMLInputElement>(null)
  const itinerary = useItineraryStore((s) => s.itinerary)
  const loadFromJSON = useItineraryStore((s) => s.loadFromJSON)

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(itinerary, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const title = itinerary?.meta?.tripTitle || 'itinerary'
    a.download = `${title.replace(/\s+/g, '_').toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '')
      loadFromJSON(text)
    }
    reader.readAsText(file)
    // limpia el input para permitir re-subir el mismo archivo si hace falta
    e.target.value = ''
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleUpload}
      />
      <button
        className="border rounded-2xl h-10 px-3 hover:bg-gray-50 transition"
        onClick={() => fileRef.current?.click()}
        title="Cargar JSON"
      >
        Cargar JSON
      </button>
      <button
        className="border rounded-2xl h-10 px-3 hover:bg-gray-50 transition"
        onClick={handleDownload}
        title="Descargar JSON"
      >
        Descargar JSON
      </button>
    </div>
  )
}
