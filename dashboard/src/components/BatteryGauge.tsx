import { useAnimatedNumber } from '../useAnimatedNumber'

interface BatteryGaugeProps {
  percent: number | null
  voltage: number | null
  current: number | null
  status: 'charging' | 'discharging' | 'idle'
  netPower: number
}

const RADIUS = 92
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const TICKS = 60

function palette(percent: number): { from: string; to: string } {
  if (percent <= 15) return { from: '#fb7185', to: '#f43f5e' }
  if (percent <= 35) return { from: '#fbbf24', to: '#f59e0b' }
  return { from: '#22d3ee', to: '#6366f1' }
}

export function BatteryGauge({ percent, voltage, current, status, netPower }: BatteryGaugeProps) {
  const animated = useAnimatedNumber(percent, 900)
  const animatedNet = useAnimatedNumber(netPower, 700)
  const value = percent === null ? 0 : Math.min(Math.max(animated, 0), 100)

  const colors = palette(value)
  const offset = CIRCUMFERENCE * (1 - value / 100)
  const angle = (value / 100) * Math.PI * 2
  const headX = 110 + RADIUS * Math.cos(angle)
  const headY = 110 + RADIUS * Math.sin(angle)

  const statusLabel =
    status === 'charging' ? 'Charging' : status === 'discharging' ? 'Discharging' : 'Idle'
  const statusColor =
    status === 'charging'
      ? 'text-emerald-400'
      : status === 'discharging'
        ? 'text-amber-400'
        : 'text-zinc-400'

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-56 w-56">
        {/* Rotating halo, brightest while power is moving. */}
        <div
          className={`spin-slow absolute inset-3 rounded-full blur-xl ${
            status === 'idle' ? 'opacity-20' : 'opacity-50'
          }`}
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, ${colors.from} 140deg, ${colors.to} 220deg, transparent 360deg)`,
          }}
        />

        <svg viewBox="0 0 220 220" className="absolute inset-0 -rotate-90">
          <defs>
            <linearGradient id="gauge-arc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={colors.from} />
              <stop offset="100%" stopColor={colors.to} />
            </linearGradient>
            <filter id="gauge-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Tick ring */}
          <g opacity="0.5">
            {Array.from({ length: TICKS }, (_, i) => {
              const t = (i / TICKS) * Math.PI * 2
              const lit = i / TICKS <= value / 100
              const inner = lit ? 72 : 76
              return (
                <line
                  key={i}
                  x1={110 + inner * Math.cos(t)}
                  y1={110 + inner * Math.sin(t)}
                  x2={110 + 79 * Math.cos(t)}
                  y2={110 + 79 * Math.sin(t)}
                  stroke={lit ? colors.from : '#2a2a33'}
                  strokeWidth={lit ? 2 : 1.5}
                  strokeLinecap="round"
                  className="transition-colors duration-500"
                />
              )
            })}
          </g>

          <circle cx="110" cy="110" r={RADIUS} fill="none" stroke="#1b1b22" strokeWidth="14" />

          <circle
            cx="110"
            cy="110"
            r={RADIUS}
            fill="none"
            stroke="url(#gauge-arc)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            filter="url(#gauge-glow)"
          />

          {/* Live pulse over the filled arc only, so it never bleeds onto the
              empty track. Shares the progress dash values. */}
          {status !== 'idle' && percent !== null && value > 2 && (
            <circle
              cx="110"
              cy="110"
              r={RADIUS}
              fill="none"
              stroke="#ffffff"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              className="breathe"
              style={{ mixBlendMode: 'overlay' }}
            />
          )}

          {percent !== null && value > 0.5 && (
            <circle cx={headX} cy={headY} r="6" fill="#fff" filter="url(#gauge-glow)" />
          )}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* The % sign is positioned out of flow so the number itself stays
              optically centred in the ring rather than the number + unit pair. */}
          <div className="relative">
            <span className="text-6xl font-semibold tracking-tight text-white tabular-nums">
              {percent === null ? '—' : Math.round(animated)}
            </span>
            <span className="absolute top-[0.3em] left-full ml-1 text-2xl text-zinc-500">%</span>
          </div>

          <span className={`mt-1 flex items-center gap-1.5 text-sm font-medium ${statusColor}`}>
            {status !== 'idle' && (
              <span className={`breathe text-xs ${status === 'charging' ? '' : 'rotate-180'}`}>
                {status === 'charging' ? '▲' : '▼'}
              </span>
            )}
            {statusLabel}
          </span>

          {Math.abs(netPower) >= 1 && (
            <span className="text-xs text-zinc-500 tabular-nums">
              {animatedNet > 0 ? '+' : ''}
              {Math.round(animatedNet)} W net
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 grid w-full grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/8 bg-black/25 px-3 py-2 text-center">
          <div className="text-[10px] tracking-wider text-zinc-500 uppercase">Voltage</div>
          <div className="text-lg font-medium text-zinc-100 tabular-nums">
            {voltage === null ? '—' : voltage.toFixed(2)}
            <span className="ml-0.5 text-xs text-zinc-500">V</span>
          </div>
        </div>
        <div className="rounded-xl border border-white/8 bg-black/25 px-3 py-2 text-center">
          <div className="text-[10px] tracking-wider text-zinc-500 uppercase">Current</div>
          <div className="text-lg font-medium text-zinc-100 tabular-nums">
            {current === null ? '—' : current.toFixed(1)}
            <span className="ml-0.5 text-xs text-zinc-500">A</span>
          </div>
        </div>
      </div>
    </div>
  )
}
