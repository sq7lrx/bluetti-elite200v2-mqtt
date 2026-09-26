import { useEffect, useRef, useState } from 'react'

interface StatTileProps {
  label: string
  value: string
  unit?: string
  accent?: string
  hint?: string
}

/** Briefly highlights the tile whenever the displayed value changes. */
function useFlash(value: string): boolean {
  const [flash, setFlash] = useState(false)
  const previous = useRef(value)

  useEffect(() => {
    if (previous.current === value) return
    previous.current = value
    setFlash(true)
    const timer = setTimeout(() => setFlash(false), 600)
    return () => clearTimeout(timer)
  }, [value])

  return flash
}

export function StatTile({ label, value, unit, accent = '#818cf8', hint }: StatTileProps) {
  const flash = useFlash(value)

  return (
    <div
      className={`rounded-xl border bg-white/[0.03] px-4 py-3 transition-colors duration-500 ${
        flash ? 'border-white/25 bg-white/[0.07]' : 'border-white/8'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
        <span className="truncate text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight text-zinc-50">{value}</span>
        {unit && <span className="text-xs text-zinc-500">{unit}</span>}
      </div>
      {hint && <div className="mt-0.5 truncate text-[11px] text-zinc-600">{hint}</div>}
    </div>
  )
}
