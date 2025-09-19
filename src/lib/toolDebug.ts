// src/lib/toolDebug.ts
import { useToolDebug } from '@/store/toolDebug.store'

/**
 * Llama esto desde tu manejador del stream cuando llegue un delta de tool:
 *   window.cvToolDebug.onToolDelta('upsert_itinerary', deltaString)
 */
function onToolDelta(fnName: string, delta: string) {
  const s = useToolDebug.getState()
  if (!s.streaming || s.lastFunctionName !== fnName) {
    s.start(fnName)
  }
  if (delta) s.appendRaw(delta)
}

/**
 * Llama esto cuando tengas el JSON completo como string.
 * Hace try/catch por si viene parcial o corrupto.
 */
function onToolEnd(fnName: string, fullArgs: string) {
  const s = useToolDebug.getState()
  if (fullArgs) {
    try {
      const parsed = JSON.parse(fullArgs)
      s.setParsed(parsed)
    } catch {
      // si no parsea, dejamos el raw para inspección
    }
  }
  s.end()
}

/**
 * Si tu assistant manda patches/partials ya parseados,
 * puedes ir guardándolos aquí (no pisa el raw).
 */
function onParsedPatch(obj: any) {
  const s = useToolDebug.getState()
  s.setParsed(obj)
}

/**
 * Limpia todo (botón "Limpiar" en la UI).
 */
function clear() {
  useToolDebug.getState().clear()
}

// Expón helpers globales para que puedas llamarlos sin importar módulos
if (typeof window !== 'undefined') {
  ;(window as any).cvToolDebug = { onToolDelta, onToolEnd, onParsedPatch, clear }
}

export const ToolDebug = { onToolDelta, onToolEnd, onParsedPatch, clear }
