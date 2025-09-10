// src/components/chat/ChatPanel.tsx
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/common/Button"
import { Input } from "@/components/ui/input"
import MessageBubble from "./MessageBubble"
import TypingBubble from "./TypingBubble"
import { useAssistantStream } from "@/hooks/useAssistantStream"
import type { ChatMessage } from "@/services/assistant"
import { useTranslation } from "react-i18next"

// GIFs locales
import textsBg from "./Texts.gif"
import thinkingGif from "./Intelligence.gif"

function normalizeRole(role: ChatMessage["role"]): "user" | "assistant" {
  return role === "system" ? "assistant" : role
}

/** Contenedor con fade-in/out correcto (cleanup devuelve void) */
function FadeMount({
  show,
  duration = 220,
  children,
  className = "",
}: {
  show: boolean
  duration?: number
  children: React.ReactNode
  className?: string
}) {
  const [render, setRender] = useState(show)

  useEffect(() => {
    let t: number | undefined
    if (show) {
      setRender(true)
    } else {
      t = window.setTimeout(() => setRender(false), duration)
    }
    return () => {
      if (t !== undefined) {
        window.clearTimeout(t)
      }
    }
  }, [show, duration])

  if (!render) return null
  return (
    <div
      className={`transition-opacity duration-200 ${show ? "opacity-100" : "opacity-0"} ${className}`}
      aria-hidden={!show}
    >
      {children}
    </div>
  )
}

// Alto (aprox) del footer sticky para reservar espacio en el scroll
const FOOTER_H = 88 // px

export default function ChatPanel({ onTool }: { onTool: (json: any) => void }) {
  const { t } = useTranslation("common")
  const { messages, streaming, send } = useAssistantStream({ onTool })

  const [text, setText] = useState("")
  const endRef = useRef<HTMLDivElement>(null) // ancla para autoscroll

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    setText("") // limpiar inmediato
    void send(trimmed)
  }

  // Autoscroll siempre al final (incluye 3 puntos y cualquier delta)
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, streaming])

  const hasMessages = messages.length > 0

  return (
    <div className="relative h-full min-h-0 flex flex-col">
      {/* Fondo con GIF (máx 60% del panel) */}
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

      {/* Lista de mensajes (scrolleable) con padding inferior = alto del footer */}
      <div
        className="relative flex-1 min-h-0 overflow-auto p-4 space-y-3"
        style={{ paddingBottom: FOOTER_H }}
      >
        {messages.map((m, idx) => (
          <MessageBubble
            key={idx}
            role={normalizeRole(m.role)}
            content={m.content}
          />
        ))}
        {streaming && <TypingBubble />}
        <div ref={endRef} />
      </div>

      {/* Thinking GIF: arriba del form; fade in/out y posicionado con el mismo offset del footer */}
      <FadeMount
        show={streaming}
        className="pointer-events-none absolute inset-x-0 z-50 flex justify-center"
      >
        <img
          src={thinkingGif}
          alt="Thinking..."
          className="h-16 opacity-90"
          style={{ position: "absolute", bottom: FOOTER_H + 8 }}
          loading="lazy"
        />
      </FadeMount>

      {/* Input sticky siempre visible */}
      <div className="sticky bottom-0 z-40 bg-background/90 backdrop-blur p-3 border-t border-border/30 flex gap-2 items-center">
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
