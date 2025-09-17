// src/components/chat/ChatPanel.tsx
import React, { useCallback, useState } from 'react'
import { useAssistantStream } from '@/hooks/useAssistantStream' // ← si no tienes alias '@/': usa '../..//hooks/useAssistantStream'

type UIBubble = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function ChatPanel() {
  const { start } = useAssistantStream()
  const [input, setInput] = useState('')
  const [chat, setChat] = useState<UIBubble[]>([])
  const [isSending, setIsSending] = useState(false)

  const addUser = (text: string) => {
    const msg: UIBubble = {
      id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
      role: 'user',
      content: text,
    }
    setChat(prev => [...prev, msg])
  }

  const ensureAssistantPlaceholder = () => {
    setChat(prev => {
      const last = prev[prev.length - 1]
      if (!last || last.role !== 'assistant') {
        const placeholder: UIBubble = {
          id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
          role: 'assistant',
          content: '',
        }
        return [...prev, placeholder]
      }
      return prev
    })
  }

  const appendAssistantText = (chunk: string) => {
    setChat(prev => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      if (last.role !== 'assistant') return prev
      const copy = prev.slice()
      copy[copy.length - 1] = { ...last, content: last.content + chunk }
      return copy
    })
  }

  const finalizeAssistantMessage = (finalText: string) => {
    if (!finalText) return
    setChat(prev => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      if (last.role !== 'assistant') return prev
      const copy = prev.slice()
      copy[copy.length - 1] = { ...last, content: finalText }
      return copy
    })
  }

  const onSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isSending) return
    setIsSending(true)
    setInput('')
    addUser(text)

    // construye el payload para el assistant con el historial mínimo necesario
    const messages = chat
      .map(m => ({ role: m.role, content: m.content }))
      .concat([{ role: 'user' as const, content: text }])

    try {
      await start(
        { messages },
        {
          ensureAssistantPlaceholder,
          appendAssistantText,
          finalizeAssistantMessage,
          onDelta: (d) => {
            // opcional: si quieres reaccionar en caliente además de appendAssistantText
          },
          onDone: () => setIsSending(false),
          onError: (err) => {
            setIsSending(false)
            ensureAssistantPlaceholder()
            appendAssistantText('Hubo un problema al procesar la respuesta.')
            console.error('[ChatPanel] stream error:', err)
          },
        }
      )
    } catch (e) {
      setIsSending(false)
      ensureAssistantPlaceholder()
      appendAssistantText('Hubo un problema al iniciar el stream.')
      console.error('[ChatPanel] start() error:', e)
    }
  }, [input, isSending, chat, start])

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Historial */}
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {chat.length === 0 ? (
          <div className="text-sm opacity-60">Empieza la conversación…</div>
        ) : (
          chat.map((m) => (
            <div
              key={m.id}
              className={`rounded-lg p-2 text-sm whitespace-pre-wrap ${
                m.role === 'user' ? 'bg-black text-white' : 'bg-white border'
              }`}
            >
              {m.content}
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="border-t p-2 flex items-end gap-2">
        <textarea
          className="flex-1 border rounded-md p-2 text-sm min-h-[40px] max-h-40 resize-y"
          placeholder="Escribe un mensaje…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          className="h-10 px-3 border rounded-md"
          onClick={onSend}
          disabled={isSending}
        >
          {isSending ? 'Enviando…' : 'Enviar'}
        </button>
        <button
          className="h-10 px-3 border rounded-md"
          onClick={() => setChat([])}
          disabled={isSending}
        >
          Limpiar
        </button>
      </div>
    </div>
  )
}
