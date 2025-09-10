// src/components/chat/TypingBubble.tsx
import thinkingGif from "./Intelligence.gif"

export default function TypingBubble() {
  // Burbuja estilo "assistant", con 3 puntos y el GIF a un lado.
  return (
    <div className="max-w-[80%]">
      <div className="rounded-2xl bg-white text-black shadow-soft border border-black/10 px-3 py-2 inline-flex items-center gap-3">
        {/* 3 puntos animados */}
        <div className="flex items-center gap-1">
          <Dot className="animation-delay-0" />
          <Dot className="animation-delay-150" />
          <Dot className="animation-delay-300" />
        </div>
        {/* GIF dentro de la burbuja */}
        <img
          src={thinkingGif}
          alt="Thinking..."
          className="h-6 w-auto opacity-90 select-none pointer-events-none"
          loading="lazy"
        />
      </div>
    </div>
  )
}

function Dot({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full bg-black/70 animate-bounce ${className}`}
      style={{
        // pequeñas variaciones para escalonar el rebote
        animationDuration: "1s",
      }}
    />
  )
}
