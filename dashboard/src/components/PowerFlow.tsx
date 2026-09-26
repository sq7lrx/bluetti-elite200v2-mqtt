import type { ReactNode } from 'react'
import { BatteryGlyph } from './BatteryGlyph'
import { formatPower } from '../format'

export interface FlowNode {
  id: string
  label: string
  watts: number | null
  accent: string
  icon: ReactNode
}

interface PowerFlowProps {
  solar: number | null
  grid: number | null
  acOut: number | null
  dcOut: number | null
  battery: number
  batteryPercent: number | null
  dcVoltage: number | null
  dcConnected: boolean
}

function Node({ node, active }: { node: FlowNode; active: boolean }) {
  const watts = node.watts ?? 0
  const power = formatPower(watts)
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border text-2xl transition-colors duration-500 ${
          active ? 'border-white/20 bg-white/10' : 'border-white/8 bg-white/[0.03] opacity-55'
        }`}
        style={active ? { boxShadow: `0 0 28px -6px ${node.accent}` } : undefined}
      >
        <span>{node.icon}</span>
        {active && (
          <span
            className="pulse-ring absolute -top-1 -right-1 h-2 w-2 rounded-full"
            style={{ color: node.accent, backgroundColor: node.accent }}
          />
        )}
      </div>
      <div className="text-center leading-tight">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">{node.label}</div>
        <div className="text-sm font-medium text-zinc-100">
          {node.watts === null ? '—' : power.value}
          <span className="ml-0.5 text-[10px] text-zinc-500">
            {node.watts === null ? '' : power.unit}
          </span>
        </div>
      </div>
    </div>
  )
}

function Link({ active, accent, reverse }: { active: boolean; accent: string; reverse?: boolean }) {
  return (
    <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="h-2 w-full">
      <line x1="0" y1="4" x2="100" y2="4" stroke="#23232b" strokeWidth="2" strokeLinecap="round" />
      {active && (
        <line
          x1={reverse ? 100 : 0}
          y1="4"
          x2={reverse ? 0 : 100}
          y2="4"
          stroke={accent}
          strokeWidth="2.5"
          strokeLinecap="round"
          className="flow-line"
        />
      )}
    </svg>
  )
}

/**
 * The DC input accepts both solar panels and low-voltage sources such as a
 * 12/24 V car socket, so pick the icon from the measured input voltage.
 */
const LOW_VOLTAGE_DC_THRESHOLD = 16

function dcInputNode(watts: number | null, voltage: number | null, connected: boolean): FlowNode {
  if (!connected) {
    return {
      id: 'dc-in',
      label: 'DC in',
      watts,
      accent: '#71717a',
      icon: <span className="text-[13px] font-semibold tracking-wide text-zinc-500">DC</span>,
    }
  }

  if (voltage !== null && voltage < LOW_VOLTAGE_DC_THRESHOLD) {
    return { id: 'dc-in', label: 'Car / DC in', watts, accent: '#fb923c', icon: '🚗' }
  }

  return { id: 'dc-in', label: 'Solar / DC in', watts, accent: '#facc15', icon: '☀️' }
}

export function PowerFlow({
  solar,
  grid,
  acOut,
  dcOut,
  battery,
  batteryPercent,
  dcVoltage,
  dcConnected,
}: PowerFlowProps) {
  const charging = battery > 5
  const discharging = battery < -5

  const inputs: FlowNode[] = [
    dcInputNode(solar, dcVoltage, dcConnected),
    { id: 'grid', label: 'Grid in', watts: grid, accent: '#38bdf8', icon: '🔌' },
  ]
  const outputs: FlowNode[] = [
    { id: 'ac', label: 'AC loads', watts: acOut, accent: '#a78bfa', icon: '🏠' },
    { id: 'dc', label: 'DC loads', watts: dcOut, accent: '#34d399', icon: '💻' },
  ]

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
      <div className="flex flex-col gap-5">
        {inputs.map((node) => (
          <div key={node.id} className="flex items-center gap-2">
            <Node node={node} active={(node.watts ?? 0) > 1} />
            <div className="flex-1">
              <Link active={(node.watts ?? 0) > 1} accent={node.accent} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-1">
        <BatteryGlyph
          percent={batteryPercent}
          status={charging ? 'charging' : discharging ? 'discharging' : 'idle'}
        />
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">
          {charging ? 'Charging' : discharging ? 'Discharging' : 'Idle'}
        </span>
      </div>

      <div className="flex flex-col gap-5">
        {outputs.map((node) => (
          <div key={node.id} className="flex items-center gap-2">
            <div className="flex-1">
              <Link active={(node.watts ?? 0) > 1} accent={node.accent} />
            </div>
            <Node node={node} active={(node.watts ?? 0) > 1} />
          </div>
        ))}
      </div>
    </div>
  )
}
