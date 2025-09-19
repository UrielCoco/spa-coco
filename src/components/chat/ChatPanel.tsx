import React, { useState } from 'react'
import { mergeItineraryPartial } from '@/services/parsers'

/**
 * ChatPanel minimal para compilar sin dependencias rotas.
 * - Envía el mensaje (no hace request real aquí).
 * - Demuestra cómo aplicar un "diff" parcial al itinerario.
 */
export default function ChatPanel() {
  const [msg, setMsg] = useState('')

  const handleSend = () => {
    if (!msg.trim()) return

    // 🎯 EJEMPLO: aplicar un "diff" al itinerario (quítalo si no lo necesitas)
    // Aquí simulamos que el asistente devolvió un parcial:
    mergeItineraryPartial({
      summary: { lastNote: msg.trim() },
    })

    setMsg('')
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b font-medium">Chat</div>

      <div className="flex-1 overflow-auto p-3 text-sm text-neutral-500">
        (Aquí podrás listar los mensajes…)
      </div>

      <div className="p-3 border-t flex gap-2">
        <input
          className="flex-1 border rounded-xl px-3 h-10"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Escribe tu mensaje…"
        />
        <button
          className="h-10 px-4 rounded-xl border hover:bg-gray-50"
          onClick={handleSend}
        >
          Enviar
        </button>
      </div>
    </div>
  )
}
