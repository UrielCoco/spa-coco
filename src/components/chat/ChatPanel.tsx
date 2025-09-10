// src/components/chat/ChatPanel.tsx
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/common/Button"
import { Input } from "@/components/ui/input"
import MessageBubble from "./MessageBubble"
import { useAssistantStream } from "@/hooks/useAssistantStream"
import type { ChatMessage } from "@/services/assistant"
import { useTranslation } from "react-i18next"

function normalizeRole(role: ChatMessage["role"]): "user" | "assistant" {
  return role === "system" ? "assistant" : role
}

export default function ChatPanel({ onTool }: { onTool: (json: any) => void }) {
  const { t } = useTranslation("common")
  const { messages, streaming, send } = useAssistantStream({ onTool })

  const [text, setText] = useState("")
  const listRef = useRef<HTMLDivElement>(null)

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    await send(trimmed)
    setText("")
  }

  // Autoscroll en cada cambio
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [messages, streaming])

  return (
    <div className="h-full flex flex-col">
      <div ref={listRef} className="flex-1 overflow-auto p-4 space-y-3">
        {messages.map((m, idx) => (
          <MessageBubble
            key={idx}
            role={normalizeRole(m.role)}
            content={m.content}
          />
        ))}
      </div>

      <div className="p-3 border-t border-border/30 flex gap-2">
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
        />
        <Button className="btn-gold" onClick={handleSend}>
          {t("send")}
        </Button>
      </div>
    </div>
  )
}
