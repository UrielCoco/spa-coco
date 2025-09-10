// src/components/chat/ChatPanel.tsx
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/common/Button"
import { Input } from "@/components/ui/input"
import MessageBubble from "./MessageBubble"
import TypingBubble from "./TypingBubble"
import { useAssistantStream } from "@/hooks/useAssistantStream"
import type { ChatMessage } from "@/services/assistant"
import { useTranslation } from "react-i18next"

// Importa tus GIFs locales (colócalos junto a este archivo)
import textsBg from "./Texts.gif"
import thinkingGif from "./Intelligence.gif"

function normalizeRole(role: ChatMessage["role"]): "user" | "assistant" {
  return role === "system" ? "assistant" : role
}

export default function ChatPanel({ onTool }: { onTool: (json: any) => void }) {
  const { t } = useTranslation("common")
  const { messages, streaming, send } = useAssistantStream({ onTool })

  const [text, setText] = useState("")
  const listRef = useRef<HTMLDivElement>(null)

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    // 1) Limpia inmediato
    setText("")
    // 2) Dispara el stream (no esperamos)
    void send(trimmed)
  }

  // Autoscroll en cada cambio
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [messages, streaming])

  const hasMessages = messages.length > 0

  return (
    <div className="relative h-full flex flex-col">
      {/* Fondo con GIF cuando no hay mensajes */}
      {!hasMessages && (
        <div className="pointer-events-none absolute inset-0 opacity-60">
          {/* usando img para que haga cover sin problemas */}
          <img
            src={textsBg}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Overlay con Intelligence.gif mientras piensa */}
      {streaming && (
        <div className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center z-10">
          <img
            src={thinkingGif}
            alt="Thinking..."
            className="h-16 opacity-85 animate-fade-in-up"
            loading="lazy"
          />
        </div>
      )}

      <div ref={listRef} className="relative flex-1 overflow-auto p-4 space-y-3">
        {messages.map((m, idx) => (
          <MessageBubble
            key={idx}
            role={normalizeRole(m.role)}
            content={m.content}
          />
        ))}
        {/* Burbujita de 3 puntos cuando está pensando */}
        {streaming && <TypingBubble />}
      </div>

      <div className="p-3 border-t border-border/30 flex gap-2 items-center">
        <Input
          aria-label={t("typeMessage")}
          placeholder={t("typeMessage")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          className="input-gold flex-1"
          disabled={streaming}
        />
        <Button
          className="btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSend}
          disabled={streaming || text.trim().length === 0}
          aria-busy={streaming}
        >
          {streaming ? t("sending") ?? "Enviando…" : t("send")}
        </Button>
      </div>
    </div>
  )
}
