import { useState } from 'react'
import type { DeviceState, FieldValue } from '../types'
import { FIELDS } from '../fields'
import { formatValue } from '../format'

interface ControlsProps {
  device: DeviceState
  disabled: boolean
  onCommand: (field: string, value: FieldValue) => void
}

function Toggle({
  label,
  on,
  disabled,
  onChange,
}: {
  label: string
  on: boolean | null
  disabled: boolean
  onChange: (next: boolean) => void
}) {
  const active = on === true
  return (
    <button
      type="button"
      disabled={disabled || on === null}
      onClick={() => onChange(!active)}
      className="group flex w-full items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-left transition enabled:hover:border-white/20 enabled:hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <div>
        <div className="text-sm font-medium text-zinc-100">{label}</div>
        <div className={`text-[11px] ${active ? 'text-emerald-400' : 'text-zinc-500'}`}>
          {on === null ? 'unavailable' : active ? 'On' : 'Off'}
        </div>
      </div>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          active ? 'bg-emerald-500/80' : 'bg-zinc-700'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            active ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  )
}

function NumberControl({
  label,
  unit,
  value,
  disabled,
  onSubmit,
}: {
  label: string
  unit?: string
  value: number | null
  disabled: boolean
  onSubmit: (next: number) => void
}) {
  const [draft, setDraft] = useState<string>('')
  const shown = draft === '' ? (value === null ? '' : String(value)) : draft

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
      <span className="text-sm text-zinc-300">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={shown}
          disabled={disabled}
          onChange={(event) => setDraft(event.target.value)}
          className="w-20 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-right text-sm text-zinc-100 outline-none focus:border-indigo-400/60 disabled:opacity-40"
        />
        {unit && <span className="text-xs text-zinc-500">{unit}</span>}
        <button
          type="button"
          disabled={disabled || draft === '' || Number.isNaN(Number(draft))}
          onClick={() => {
            onSubmit(Number(draft))
            setDraft('')
          }}
          className="rounded-lg border border-indigo-400/30 bg-indigo-500/15 px-2.5 py-1 text-xs font-medium text-indigo-200 transition enabled:hover:bg-indigo-500/30 disabled:opacity-30"
        >
          Set
        </button>
      </div>
    </div>
  )
}

export function Controls({ device, disabled, onCommand }: ControlsProps) {
  const read = (id: string): FieldValue => device.fields[id]?.value ?? null
  const available = (id: string) => id in device.fields

  const toggles = FIELDS.filter((f) => f.kind === 'bool' && f.settable && available(f.id))
  const numbers = FIELDS.filter((f) => f.kind === 'numeric' && f.settable && available(f.id))
  const enums = FIELDS.filter((f) => f.kind === 'enum' && available(f.id))

  if (toggles.length === 0 && numbers.length === 0 && enums.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No controllable fields reported yet. Controls appear once the bridge publishes their state.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {toggles.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {toggles.map((field) => (
            <Toggle
              key={field.id}
              label={field.label}
              on={typeof read(field.id) === 'boolean' ? (read(field.id) as boolean) : null}
              disabled={disabled}
              onChange={(next) => onCommand(field.id, next)}
            />
          ))}
        </div>
      )}

      {numbers.length > 0 && (
        <div className="space-y-2">
          {numbers.map((field) => (
            <NumberControl
              key={field.id}
              label={field.label}
              unit={field.unit}
              value={typeof read(field.id) === 'number' ? (read(field.id) as number) : null}
              disabled={disabled}
              onSubmit={(next) => onCommand(field.id, next)}
            />
          ))}
        </div>
      )}

      {enums.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {enums.map((field) => (
            <div
              key={field.id}
              className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3"
            >
              <span className="text-sm text-zinc-300">{field.label}</span>
              <span className="text-sm font-medium text-zinc-100 capitalize">
                {formatValue(read(field.id), field).toLowerCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
