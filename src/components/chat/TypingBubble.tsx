// src/components/chat/TypingBubble.tsx
export default function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="w-fit max-w-[80%] rounded-2xl px-4 py-2 shadow-soft border border-border/30 bg-card animate-fade-in-up">
        <div className="h-5 flex items-center gap-2">
          <span className="typing-dot" />
          <span className="typing-dot delay-200" />
          <span className="typing-dot delay-400" />
        </div>
      </div>
    </div>
  )
}
