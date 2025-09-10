// src/components/common/ConnectionPill.tsx
export default function ConnectionPill() {
  const base = import.meta.env.VITE_ASSISTANT_BASE_URL || ''
  const host = (() => {
    try { return new URL(base, window.location.origin).host } catch { return base }
  })()
  return (
    <span
      title={base}
      className="text-xs px-2 py-1 rounded-full border bg-green-50 border-green-200 text-green-700"
    >
      Connected · {host || 'not set'}
    </span>
  )
}
