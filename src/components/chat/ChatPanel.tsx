// src/components/chat/ChatPanel.tsx
import React, { useCallback, useState } from 'react'
import useAssistantStream, { type Message } from '@/hooks/useAssistantStream'

export default function ChatPanel() {
  const { messages, isLoading, sendMessage, clear } = useAssistantStream()
  const [input, setInput] = useState<string>('')

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value)
    },
    []
  )

  const onKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (!input.trim() || isLoading) return
        const toSend = input.trim()
        setInput('')
        await sendMessage(toSend)
      }
    },
    [input, isLoading, sendMessage]
  )

  const onClickSend = useCallback(async () => {
    if (!input.trim() || isLoading) return
    const toSend = input.trim()
    setInput('')
    await sendMessage(toSend)
  }, [input, isLoading, sendMessage])

  return (
    <div className="h-full flex flex-col">
      {/* Historial */}
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <div className="text-sm opacity-60">Empieza la conversación…</div>
        ) : (
          messages.map((m: Message) => (
            <div
              key={m.id}
              className={`rounded-lg p-2 text-sm ${
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
          onChange={onChange}
          onKeyDown={onKeyDown}
        />
        <button
          className="h-10 px-3 border rounded-md"
          onClick={onClickSend}
          disabled={isLoading}
        >
          {isLoading ? 'Enviando…' : 'Enviar'}
        </button>
        <button className="h-10 px-3 border rounded-md" onClick={clear}>
          Limpiar
        </button>
      </div>
    </div>
  )
}
