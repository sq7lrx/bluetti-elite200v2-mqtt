import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { HistoryPoint } from '../types'
import { formatClock } from '../format'

const SERIES = [
  { id: 'dc_input_power', label: 'Solar / DC in', color: '#facc15' },
  { id: 'ac_input_power', label: 'AC in', color: '#38bdf8' },
  { id: 'ac_output_power', label: 'AC out', color: '#a78bfa' },
  { id: 'dc_output_power', label: 'DC out', color: '#34d399' },
]

const axisStyle = { fill: '#71717a', fontSize: 11 }

function TooltipBox({
  active,
  payload,
  label,
  suffix,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number | null; color?: string; dataKey?: string }>
  label?: number
  suffix: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-950/95 px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 text-zinc-500">{label ? formatClock(label) : ''}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-zinc-400">{entry.name}</span>
          <span className="ml-auto font-medium text-zinc-100">
            {entry.value === null || entry.value === undefined
              ? '—'
              : Number(entry.value).toLocaleString()}
            {suffix}
          </span>
        </div>
      ))}
    </div>
  )
}

export function PowerChart({ data }: { data: HistoryPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid stroke="#1e1e26" vertical={false} />
        <XAxis
          dataKey="t"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={formatClock}
          tick={axisStyle}
          stroke="#2a2a33"
          minTickGap={48}
        />
        <YAxis tick={axisStyle} stroke="#2a2a33" width={56} unit=" W" />
        <Tooltip content={<TooltipBox suffix=" W" />} />
        {SERIES.map((series) => (
          <Line
            key={series.id}
            type="monotone"
            dataKey={series.id}
            name={series.label}
            stroke={series.color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

export function SocChart({ data }: { data: HistoryPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="soc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#1e1e26" vertical={false} />
        <XAxis
          dataKey="t"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={formatClock}
          tick={axisStyle}
          stroke="#2a2a33"
          minTickGap={48}
        />
        <YAxis domain={[0, 100]} tick={axisStyle} stroke="#2a2a33" width={56} unit=" %" />
        <Tooltip content={<TooltipBox suffix=" %" />} />
        <Area
          type="monotone"
          dataKey="total_battery_percent"
          name="Battery"
          stroke="#22d3ee"
          strokeWidth={2}
          fill="url(#soc)"
          isAnimationActive={false}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function ChartLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {SERIES.map((series) => (
        <div key={series.id} className="flex items-center gap-1.5">
          <span className="h-1.5 w-3 rounded-full" style={{ backgroundColor: series.color }} />
          <span className="text-[11px] text-zinc-500">{series.label}</span>
        </div>
      ))}
    </div>
  )
}
