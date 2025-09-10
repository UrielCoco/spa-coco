// src/components/chat/MessageBubble.tsx
import { cn } from "@/lib/utils"

type Props = {
  role: "user" | "assistant"
  content: string
  className?: string
}

export default function MessageBubble({ role, content, className }: Props) {
  const isUser = role === "user"
  return (
    <div
      className={cn(
        "max-w-[80%] rounded-2xl px-4 py-2 shadow-soft",
        isUser
          ? "ml-auto bg-black text-white"
          : "bg-card text-card-foreground border border-border/30",
        className
      )}
      // 🔑 Muestra TODO: sin truncates ni line-clamp
      style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
      aria-live={isUser ? "off" : "polite"}
    >
      {content}
    </div>
  )
}
