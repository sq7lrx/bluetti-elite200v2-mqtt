import { useAnimatedNumber } from '../useAnimatedNumber'

const WAVE_PERIOD = 44

/**
 * A smooth sine surface sampled as a polyline, wide enough that scrolling it by
 * exactly one period keeps the cavity covered and loops seamlessly.
 */
function wavePath(amplitude: number, phase: number, depth = 90): string {
  const from = -WAVE_PERIOD
  const to = WAVE_PERIOD * 3
  const steps = 96
  const points: string[] = []
  for (let i = 0; i <= steps; i++) {
    const x = from + ((to - from) * i) / steps
    const y = amplitude * Math.sin((x / WAVE_PERIOD) * Math.PI * 2 + phase)
    points.push(`${x.toFixed(2)} ${y.toFixed(2)}`)
  }
  return `M ${points.join(' L ')} L ${to} ${depth} L ${from} ${depth} Z`
}

interface BatteryGlyphProps {
  percent: number | null
  status: 'charging' | 'discharging' | 'idle'
}

function fillColors(percent: number): { from: string; to: string } {
  if (percent <= 15) return { from: '#e11d48', to: '#fb7185' }
  if (percent <= 35) return { from: '#d97706', to: '#fbbf24' }
  return { from: '#059669', to: '#4ade80' }
}

/**
 * Battery with a liquid fill: the level tracks the state of charge and the
 * surface ripples while the pack is charging or discharging.
 */
export function BatteryGlyph({ percent, status }: BatteryGlyphProps) {
  const animated = useAnimatedNumber(percent, 900)
  const value = percent === null ? 0 : Math.min(Math.max(animated, 0), 100)
  const colors = fillColors(value)

  // Inner cavity of the battery body in SVG units.
  const top = 14
  const height = 74
  const fillHeight = (height * value) / 100
  const fillY = top + height - fillHeight
  const active = status !== 'idle'

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 64 100" className="h-24 w-20">
        <defs>
          <linearGradient id="batt-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.to} />
            <stop offset="100%" stopColor={colors.from} />
          </linearGradient>
          <clipPath id="batt-cavity">
            <rect x="10" y={top} width="44" height={height} rx="6" />
          </clipPath>
          <filter id="batt-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Terminal */}
        <rect x="24" y="4" width="16" height="7" rx="2.5" fill="#3f3f49" />

        {/* Body */}
        <rect
          x="7"
          y={top - 3}
          width="50"
          height={height + 6}
          rx="9"
          fill="#0d0d12"
          stroke="rgba(255,255,255,0.16)"
          strokeWidth="2"
        />

        <g clipPath="url(#batt-cavity)">
          {/* Body of the liquid, starting below the wave crests so the waves
              themselves form the visible surface. */}
          <rect
            x="10"
            y={fillY}
            width="44"
            height={fillHeight + 6}
            fill="url(#batt-fill)"
            opacity="0.92"
          />

          {value > 1 && value < 99.5 && (
            <>
              {/* Back crest: the darker shade, offset in phase and direction. */}
              <g transform={`translate(10 ${fillY})`}>
                <g className={active ? 'wave-slide-slow' : undefined}>
                  <path d={wavePath(4.4, 1.1)} fill={colors.from} opacity="0.95" />
                </g>
              </g>

              {/* Front crest: the lighter shade topped by a bright meniscus. */}
              <g transform={`translate(10 ${fillY})`}>
                <g className={active ? 'wave-slide' : undefined}>
                  <path d={wavePath(3.2, 0)} fill={colors.to} opacity="0.95" />
                  <path
                    d={wavePath(3.2, 0)}
                    fill="none"
                    stroke="#ffffff"
                    strokeOpacity="0.85"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </g>
              </g>
            </>
          )}

          {/* Bubbles rising while charging */}
          {status === 'charging' &&
            [16, 30, 44].map((x, i) => (
              <circle
                key={x}
                className="bubble"
                cx={x}
                cy={top + height - 6}
                r={i === 1 ? 2.4 : 1.7}
                fill="#ffffff"
                opacity="0.6"
                style={{ animationDelay: `${i * 0.7}s` }}
              />
            ))}
        </g>

        {/* Bolt overlay while charging */}
        {status === 'charging' && (
          <path
            d="M36 30 L24 54 h8 l-4 18 14-26 h-8 z"
            fill="#ffffff"
            opacity="0.9"
            filter="url(#batt-glow)"
          />
        )}

        <rect
          x="7"
          y={top - 3}
          width="50"
          height={height + 6}
          rx="9"
          fill="none"
          stroke={active ? colors.to : 'transparent'}
          strokeOpacity="0.5"
          strokeWidth="2"
          className={active ? 'breathe' : undefined}
        />
      </svg>

      <span className="text-sm font-semibold text-white tabular-nums">
        {percent === null ? '—' : `${Math.round(animated)}%`}
      </span>
    </div>
  )
}
