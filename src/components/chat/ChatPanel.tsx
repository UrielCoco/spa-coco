// src/components/chat/ChatPanel.tsx
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/common/Button"
import { Input } from "@/components/ui/input"
import MessageBubble from "./MessageBubble"
import TypingBubble from "./TypingBubble"
import { useAssistantStream } from "@/hooks/useAssistantStream"
import type { ChatMessage } from "@/services/assistant"
import { useTranslation } from "react-i18next"
import textsBg from "./Texts.gif"

function normalizeRole(role: ChatMessage["role"]): "user" | "assistant" {
  return role === "system" ? "assistant" : role
}

// Alto del footer sticky para reservar espacio real en el área scrolleable
const FOOTER_H = 88 // px

export default function ChatPanel({ onTool }: { onTool: (json: any) => void }) {
  const { t } = useTranslation("common")
  const { messages, streaming, send } = useAssistantStream({ onTool })

  const [text, setText] = useState("")
  const endRef = useRef<HTMLDivElement>(null)         // ancla al final
  const lastBubbleRef = useRef<HTMLDivElement>(null)   // última burbuja visible (o la de typing)

  const scrollToLast = (smooth = true) => {
    // Usamos la última burbuja como referencia para que SIEMPRE quede visible
    if (lastBubbleRef.current) {
      lastBubbleRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      })
    } else {
      endRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" })
    }
  }

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    setText("") // limpiar inmediato
    void send(trimmed)
  }

  // Autoscroll cuando cambian mensajes o entra/sale el streaming
  useEffect(() => {
    scrollToLast(true)
  }, [messages.length, streaming])

  // Si la última burbuja cambia de tamaño (por contenido dinámico), mantenerla visible.
  useEffect(() => {
    const el = lastBubbleRef.current
    if (!el) return
    const ro = new ResizeObserver(() => scrollToLast(false))
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastBubbleRef.current])

  const hasMessages = messages.length > 0
  const lastIndex = messages.length - 1

  return (
    <div className="relative h-full min-h-0 flex flex-col">
      {/* Fondo con GIF (máx 60% del panel) cuando no hay mensajes */}
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

      {/* Lista de mensajes con padding inferior = alto del footer (para que nada quede tapado) */}
      <div
        className="relative flex-1 min-h-0 overflow-auto p-4 space-y-3"
        style={{ paddingBottom: FOOTER_H }}
      >
        {messages.map((m, idx) => {
          const isLastRendered = !streaming && idx === lastIndex
          return (
            <div key={idx} ref={isLastRendered ? lastBubbleRef : undefined}>
              <MessageBubble role={normalizeRole(m.role)} content={m.content} />
            </div>
          )
        })}

        {/* Burbuja de “pensando”: incluye los 3 puntos + GIF y es la última burbuja mientras stream */}
        {streaming && (
          <div ref={lastBubbleRef}>
            <TypingBubble />
          </div>
        )}

        {/* ancla final de seguridad */}
        <div ref={endRef} />
      </div>

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
