import type { FieldValue } from './types'
import type { FieldDef } from './fields'

export function isNumber(value: FieldValue): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function formatNumber(value: number, precision?: number): string {
  const digits = precision ?? (Number.isInteger(value) ? 0 : 1)
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function formatValue(value: FieldValue, def?: FieldDef): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'On' : 'Off'
  if (isNumber(value)) return formatNumber(value, def?.precision)
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value).replace(/_/g, ' ')
}

export function formatPower(watts: number): { value: string; unit: string } {
  if (Math.abs(watts) >= 1000) {
    return { value: (watts / 1000).toFixed(2), unit: 'kW' }
  }
  return { value: Math.round(watts).toString(), unit: 'W' }
}

export function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ${minutes % 60}m ago`
  return `${Math.floor(hours / 24)}d ago`
}

/** The pack reports temperatures in Fahrenheit, like pack_avg_temp. */
export function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9
}

export function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
