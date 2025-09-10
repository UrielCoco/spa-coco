// src/components/chat/MessageBubble.tsx
import { cn } from "@/lib/utils"
import { useEffect, useMemo, useState } from "react"

type Props = {
  role: "user" | "assistant"
  content: string
  className?: string
}

/** Muestra el texto con un efecto “apareciendo”. */
function AnimatedText({ text, enable = true }: { text: string; enable?: boolean }) {
  const [n, setN] = useState(enable ? 0 : text.length)

  // Velocidad adaptativa (rápido en textos largos, más lento en cortos)
  const stepMs = useMemo(() => {
    const len = Math.max(1, text.length)
    return Math.max(8, Math.min(24, Math.floor(len / 12))) // 8..24ms aprox
  }, [text])

  useEffect(() => {
    if (!enable) {
      setN(text.length)
      return
    }
    setN(0)
    let cancelled = false
    let i = 0
    const tick = () => {
      if (cancelled) return
      i += 1
      setN((prev) => {
        const next = Math.min(text.length, prev + 1)
        return next
      })
      if (i < text.length) {
        setTimeout(tick, stepMs) // simple, sin rAF para mantenerlo determinista
      }
    }
    setTimeout(tick, stepMs)
    return () => {
      cancelled = true
    }
  }, [text, enable, stepMs])

  return <span>{text.slice(0, n)}</span>
}

export default function MessageBubble({ role, content, className }: Props) {
  const isUser = role === "user"

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "w-fit max-w-[80%] rounded-2xl px-4 py-2 shadow-soft border border-border/30 animate-fade-in-up",
          isUser ? "bg-black text-white" : "bg-card text-card-foreground",
          className
        )}
        style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
        aria-live={isUser ? "off" : "polite"}
      >
        {isUser ? content : <AnimatedText text={content} enable={true} />}
      </div>
    </div>
  )
}
