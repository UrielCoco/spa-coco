import { useEffect, useRef, useState } from 'react'

type Props = { left: React.ReactNode; right: React.ReactNode }

export default function ResizableSplit({ left, right }: Props) {
  const [ratio, setRatio] = useState<number>(() => Number(localStorage.getItem('split:ratio')||'0.4'))
  const dragging = useRef(false)

  useEffect(() => { localStorage.setItem('split:ratio', String(ratio)) }, [ratio])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const x = e.clientX
      const w = window.innerWidth
      const r = Math.min(0.8, Math.max(0.2, x / w))
      setRatio(r)
    }
    const up = () => (dragging.current = false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', up) }
  }, [])

  return (
    <div className="hidden md:flex h-[calc(100vh-72px)]">
      <div style={{ width: `${ratio*100}%` }} className="border-r overflow-hidden">{left}</div>
      <div
        className="w-1 bg-border cursor-col-resize"
        onMouseDown={() => (dragging.current = true)}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panels"
      />
      <div style={{ width: `${(1-ratio)*100}%` }} className="overflow-auto">{right}</div>
    </div>
  )
}
