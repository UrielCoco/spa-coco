import type { Itinerary, LabelMap } from "@/types/itinerary"
import { useItinerary } from "@/store/itinerary.store"

/** Normaliza lo que venga del tool del assistant a un Partial<Itinerary> plano */
function normalizePartial(input: any): Partial<Itinerary> | undefined {
  if (input == null) return undefined
  let raw = input

  // Si viene como string JSON
  if (typeof raw === "string") {
    try { raw = JSON.parse(raw) } catch { /* ignore */ }
  }

  // Si viene como envoltura { arguments: string|object } (estilo OpenAI tools)
  if (raw && typeof raw === "object" && "arguments" in raw) {
    const args = (raw as any).arguments
    try { raw = typeof args === "string" ? JSON.parse(args) : args } catch { raw = args }
  }

  // Si viene con clave { partial: {...} }
  if (raw && typeof raw === "object" && "partial" in raw) {
    raw = (raw as any).partial
  }

  // Ya debería ser un Partial<Itinerary>
  return (raw && typeof raw === "object") ? (raw as Partial<Itinerary>) : undefined
}

/**
 * Fusiona un parcial de Itinerary en el store (persistente).
 * Acepta payloads en varios formatos ({partial}, {arguments}, stringified).
 */
export function mergeItinerary(input: any) {
  const partial = normalizePartial(input)
  if (!partial) return
  useItinerary.getState().mergeItinerary(partial)
}

/** Si el assistant manda etiquetas de UI, se aplican dando prioridad a las nuevas */
export function extractLabels(input: any): LabelMap | undefined {
  const partial = normalizePartial(input)
  return partial?.labels
}
