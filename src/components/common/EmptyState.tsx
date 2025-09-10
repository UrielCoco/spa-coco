export function EmptyState({ title, desc, cta }: { title: string; desc?: string; cta?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-gray-600">
      <div className="font-semibold mb-1">{title}</div>
      {desc && <div className="mb-3">{desc}</div>}
      {cta}
    </div>
  )
}
