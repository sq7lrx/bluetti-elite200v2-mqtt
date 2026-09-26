import { useMemo, useState } from 'react'
import type { DeviceState } from '../types'
import { FIELD_BY_ID, GROUP_LABELS, GROUP_ORDER, humanize } from '../fields'
import type { FieldGroup } from '../fields'
import { formatClock, formatValue } from '../format'

interface Row {
  id: string
  label: string
  group: FieldGroup | 'other'
  value: string
  unit?: string
  at: number
}

export function RawTable({ device }: { device: DeviceState }) {
  const [query, setQuery] = useState('')

  const rows = useMemo<Row[]>(
    () =>
      Object.entries(device.fields)
        .map(([id, state]) => {
          const def = FIELD_BY_ID.get(id)
          const row: Row = {
            id,
            label: def?.label ?? humanize(id),
            group: def?.group ?? 'other',
            value: formatValue(state.value, def),
            unit: def?.unit,
            at: state.at,
          }
          return row
        })
        .sort((a, b) => a.label.localeCompare(b.label)),
    [device.fields],
  )

  const filtered = rows.filter((row) => {
    if (!query) return true
    const needle = query.toLowerCase()
    return row.id.includes(needle) || row.label.toLowerCase().includes(needle)
  })

  const groups: Array<FieldGroup | 'other'> = [...GROUP_ORDER, 'other']

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter fields…"
          className="w-full max-w-xs rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-indigo-400/60"
        />
        <span className="text-xs text-zinc-600">
          {filtered.length} of {rows.length} fields
        </span>
      </div>

      <div className="space-y-5">
        {groups.map((group) => {
          const groupRows = filtered.filter((row) => row.group === group)
          if (groupRows.length === 0) return null
          const title = group === 'other' ? 'Other' : GROUP_LABELS[group]

          return (
            <div key={group}>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                {title}
              </h3>
              <div className="overflow-hidden rounded-xl border border-white/8">
                <table className="w-full text-sm">
                  <tbody>
                    {groupRows.map((row, index) => (
                      <tr
                        key={row.id}
                        className={index % 2 ? 'bg-white/[0.02]' : 'bg-transparent'}
                      >
                        <td className="px-4 py-2 text-zinc-300">
                          {row.label}
                          <span className="ml-2 font-mono text-[10px] text-zinc-600">{row.id}</span>
                        </td>
                        <td className="px-4 py-2 text-right font-medium whitespace-nowrap text-zinc-100">
                          {row.value}
                          {row.unit && <span className="ml-1 text-xs text-zinc-500">{row.unit}</span>}
                        </td>
                        <td className="w-24 px-4 py-2 text-right text-[11px] whitespace-nowrap text-zinc-600">
                          {formatClock(row.at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
