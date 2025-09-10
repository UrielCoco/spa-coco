// src/components/chat/ChatPanel.tsx
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/common/Button"
import { Input } from "@/components/ui/input"
import MessageBubble from "./MessageBubble"
import TypingBubble from "./TypingBubble"
import { useAssistantStream } from "@/hooks/useAssistantStream"
import type { ChatMessage } from "@/services/assistant"
import { useTranslation } from "react-i18next"

// GIFs locales (mismos que ya usas)
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
    // limpiar inmediato (tu petición #2)
    setText("")
    void send(trimmed)
  }

  // autoscroll en cada cambio
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [messages, streaming])

  const hasMessages = messages.length > 0

  return (
    // min-h-0 asegura que el área de mensajes pueda overflow Scroll
    <div className="relative h-full min-h-0 flex flex-col">
      {/* Fondo con GIF cuando no hay mensajes, centrado y limitado al 60% (tu petición #5) */}
      {!hasMessages && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <img
            src={textsBg}
            alt=""
            className="opacity-60 max-w-[60%] max-h-[60%] w-auto h-auto object-contain"
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

      {/* Lista de mensajes: hace scroll, el input queda sticky */}
      <div ref={listRef} className="relative flex-1 min-h-0 overflow-auto p-4 space-y-3">
        {messages.map((m, idx) => (
          <MessageBubble
            key={idx}
            role={normalizeRole(m.role)}
            content={m.content}
          />
        ))}
        {streaming && <TypingBubble />}
      </div>

      {/* Input siempre visible con sticky bottom (tu petición #1) */}
      <div className="sticky bottom-0 z-20 bg-background/90 backdrop-blur p-3 border-t border-border/30 flex gap-2 items-center">
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
          disabled={streaming} // tu petición #3
        />
        <Button
          className="btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSend}
          disabled={streaming || text.trim().length === 0} // tu petición #3
          aria-busy={streaming}
        >
          {streaming ? t("sending") ?? "Enviando…" : t("send")}
        </Button>
      </div>
    </div>
  )
}
