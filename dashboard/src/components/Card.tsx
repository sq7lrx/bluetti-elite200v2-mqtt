import { useState, type ReactNode } from 'react'

interface CardProps {
  title?: string
  subtitle?: string
  action?: ReactNode
  className?: string
  /** Renders the header as a toggle that shows or hides the body. */
  collapsible?: boolean
  defaultOpen?: boolean
  children: ReactNode
}

export function Card({
  title,
  subtitle,
  action,
  className = '',
  collapsible = false,
  defaultOpen = true,
  children,
}: CardProps) {
  const [open, setOpen] = useState(defaultOpen)
  const expanded = !collapsible || open

  const heading = (
    <div className="flex items-center gap-2">
      {collapsible && (
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={`h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform duration-200 ${
            expanded ? 'rotate-90' : ''
          }`}
        >
          <path
            d="M7 4l6 6-6 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      <div className="text-left">
        {title && (
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            {title}
          </h2>
        )}
        {subtitle && <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>}
      </div>
    </div>
  )

  return (
    <section
      className={`rounded-2xl border border-white/8 bg-white/[0.035] p-5 shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_20px_40px_-32px_rgba(0,0,0,0.9)] backdrop-blur-sm ${className}`}
    >
      {(title || action) && (
        <header className={`flex items-start justify-between gap-3 ${expanded ? 'mb-4' : ''}`}>
          {collapsible ? (
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={expanded}
              className="cursor-pointer rounded-lg transition-opacity hover:opacity-80"
            >
              {heading}
            </button>
          ) : (
            heading
          )}
          {action}
        </header>
      )}
      {expanded && children}
    </section>
  )
}
