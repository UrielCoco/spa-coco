import React, { useEffect, useRef, useState } from "react"

type Props = {
  left: React.ReactNode
  right: React.ReactNode
  /** width ratio (0.2..0.8) for left pane in desktop */
  defaultRatio?: number
}

const LS_KEY = "ui:split:ratio"

export default function ResizableSplit({ left, right, defaultRatio = 0.4 }: Props) {
  const [ratio, setRatio] = useState<number>(() => {
    const raw = localStorage.getItem(LS_KEY)
    const n = raw ? Number(raw) : defaultRatio
    return Number.isFinite(n) ? Math.min(0.8, Math.max(0.2, n)) : defaultRatio
  })

  const draggingRef = useRef(false)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return
      const w = window.innerWidth
      const next = Math.min(0.8, Math.max(0.2, e.clientX / w))
      setRatio(next)
    }
    const onUp = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      localStorage.setItem(LS_KEY, String(ratio))
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [ratio])

  return (
    <div className="h-full w-full flex">
      {/* Left */}
      <div className="hidden md:block" style={{ width: `${ratio * 100}%` }}>
        {left}
      </div>

      {/* Divider con sombra (no dorado) */}
      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={() => (draggingRef.current = true)}
        className="relative w-2 cursor-col-resize group"
        title="Arrastra para redimensionar"
      >
        {/* sombra suave */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_12px_rgba(0,0,0,.25)]" />
        {/* handle visible */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-1 rounded-full bg-black/20 group-hover:bg-black/30" />
      </div>

      {/* Right */}
      <div className="flex-1 min-w-0">{right}</div>

      {/* Mobile = tabs (ya lo tienes en tus páginas, esto solo controla desktop) */}
    </div>
  )
}
