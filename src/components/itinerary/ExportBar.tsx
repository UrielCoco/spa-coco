import { useRef } from "react"
import { Button } from "@/components/common/Button"
import { useItinerary } from "@/store/itinerary.store"
import type { Itinerary } from "@/types/itinerary"
import { useTranslation } from "react-i18next"

export default function ExportBar() {
  const { t, i18n } = useTranslation("common")

  // 👇 Usamos las APIs reales del store: itinerary, reset y loadFromJSON
  const { itinerary, reset, loadFromJSON } = useItinerary((s) => ({
    itinerary: s.itinerary,
    reset: s.reset,
    loadFromJSON: s.loadFromJSON,
  }))

  const fileRef = useRef<HTMLInputElement>(null)

  const handleNew = () => {
    reset()
  }

  const handleOpenClick = () => fileRef.current?.click()

  const handleOpenFile = async (file: File | null) => {
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as Itinerary
      loadFromJSON(parsed) // ⬅️ reemplaza al antiguo replace()
    } catch (e) {
      console.error("Invalid JSON", e)
      alert("El archivo no es un JSON válido de itinerario.")
    } finally {
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const handleSave = () => {
    const blob = new Blob([JSON.stringify(itinerary, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "itinerary.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    window.print()
  }

  const toggleLang = () => {
    const next = i18n.language?.startsWith("es") ? "en" : "es"
    i18n.changeLanguage(next)
  }

  return (
    <div className="flex items-center gap-2">
      <Button onClick={handleNew}>{t("new") ?? "Nuevo"}</Button>

      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => handleOpenFile(e.target.files?.[0] ?? null)}
      />
      <Button onClick={handleOpenClick}>{t("openJson") ?? "Abrir JSON"}</Button>

      <Button onClick={handleSave}>{t("saveJson") ?? "Guardar JSON"}</Button>

      <Button onClick={handlePrint}>{t("exportPdf") ?? "Exportar PDF"}</Button>

      <Button onClick={toggleLang}>{(i18n.language || "ES").toUpperCase()}</Button>
    </div>
  )
}
