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
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          // bubble
          "w-fit max-w-[80%] rounded-2xl px-4 py-2 shadow-soft border border-border/30 animate-fade-in-up",
          isUser ? "bg-black text-white" : "bg-card text-card-foreground",
          className
        )}
        style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
        aria-live={isUser ? "off" : "polite"}
      >
        {content}
      </div>
    </div>
  )
}
