import type { DeviceState } from '../types'
import { fahrenheitToCelsius, formatNumber } from '../format'

function num(device: DeviceState, id: string): number | null {
  const value = device.fields[id]?.value
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function cellColor(voltage: number, min: number, max: number): string {
  if (max - min < 0.0005) return '#34d399'
  const ratio = (voltage - min) / (max - min)
  if (ratio < 0.25) return '#fb7185'
  if (ratio < 0.6) return '#fbbf24'
  return '#34d399'
}

function Metric({ label, value, unit, hint }: { label: string; value: string; unit?: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/25 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-0.5 text-lg font-medium text-zinc-100">
        {value}
        {unit && <span className="ml-0.5 text-xs text-zinc-500">{unit}</span>}
      </div>
      {hint && <div className="text-[11px] text-zinc-600">{hint}</div>}
    </div>
  )
}

export function BatteryPacks({ device }: { device: DeviceState }) {
  const raw = device.fields['cell_voltages']?.value
  const voltages = Array.isArray(raw) ? (raw as number[]).filter((v) => typeof v === 'number') : []

  const temps = ['pack_temp1', 'pack_temp2', 'pack_temp3', 'pack_temp4']
    .map((id) => num(device, id))
    .filter((value): value is number => value !== null)

  const soh = num(device, 'pack_soh')
  const packs = num(device, 'pack_cnts')
  const maxChgVoltage = num(device, 'pack_max_chg_voltage')
  const maxChgCurrent = num(device, 'pack_max_chg_current')
  const maxDsgCurrent = num(device, 'pack_max_dsg_current')
  const chgFull = num(device, 'pack_chg_full_time')
  const dsgEmpty = num(device, 'pack_dsg_empty_time')

  if (voltages.length === 0 && temps.length === 0 && soh === null) {
    return (
      <p className="text-sm text-zinc-500">
        No pack data published yet. It arrives on the next poll of register blocks 6000 and 6300.
      </p>
    )
  }

  const min = voltages.length ? Math.min(...voltages) : 0
  const max = voltages.length ? Math.max(...voltages) : 0
  const avg = voltages.length ? voltages.reduce((a, b) => a + b, 0) / voltages.length : 0
  const spread = (max - min) * 1000

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric label="State of health" value={soh === null ? '—' : String(soh)} unit="%" />
        <Metric
          label="Cell spread"
          value={voltages.length ? spread.toFixed(0) : '—'}
          unit="mV"
          hint={voltages.length ? `${voltages.length} cells` : undefined}
        />
        <Metric
          label="Cell average"
          value={voltages.length ? avg.toFixed(3) : '—'}
          unit="V"
          hint={voltages.length ? `${min.toFixed(3)} – ${max.toFixed(3)} V` : undefined}
        />
        <Metric
          label="Temperature"
          value={temps.length ? formatNumber(fahrenheitToCelsius(Math.max(...temps)), 1) : '—'}
          unit="°C"
          hint={temps.length ? `${temps.length} sensors, max` : undefined}
        />
        <Metric
          label="Charge limits"
          value={maxChgVoltage === null ? '—' : maxChgVoltage.toFixed(1)}
          unit="V"
          hint={maxChgCurrent === null ? undefined : `max ${maxChgCurrent.toFixed(1)} A in`}
        />
        <Metric
          label="Discharge limit"
          value={maxDsgCurrent === null ? '—' : maxDsgCurrent.toFixed(1)}
          unit="A"
          hint={packs === null ? undefined : `${packs} pack${packs === 1 ? '' : 's'}`}
        />
      </div>

      {(chgFull !== null || dsgEmpty !== null) && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric
            label="Time to full"
            value={chgFull === null ? '—' : formatNumber(chgFull / 60, 1)}
            unit="h"
          />
          <Metric
            label="Time to empty"
            value={dsgEmpty === null ? '—' : formatNumber(dsgEmpty / 60, 1)}
            unit="h"
          />
        </div>
      )}

      {voltages.length > 0 && (
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-[11px] font-semibold tracking-[0.14em] text-zinc-600 uppercase">
              Cell voltages
            </h3>
            <span className="text-[11px] text-zinc-600">
              lowest cell C{voltages.indexOf(min) + 1} · highest cell C{voltages.indexOf(max) + 1}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {voltages.map((voltage, index) => {
              const ratio = max - min < 0.0005 ? 1 : (voltage - min) / (max - min)
              return (
                <div
                  key={index}
                  className="rounded-lg border border-white/8 bg-black/30 px-2 pt-1.5 pb-2 text-center"
                >
                  <div className="text-[9px] text-zinc-600">C{index + 1}</div>
                  <div
                    className="text-xs font-medium"
                    style={{ color: cellColor(voltage, min, max) }}
                  >
                    {voltage.toFixed(3)}
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{
                        width: `${15 + ratio * 85}%`,
                        backgroundColor: cellColor(voltage, min, max),
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {temps.length > 0 && (
        <div>
          <h3 className="mb-2 text-[11px] font-semibold tracking-[0.14em] text-zinc-600 uppercase">
            Temperature sensors
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {temps.map((temp, index) => (
              <div
                key={index}
                className="rounded-lg border border-white/8 bg-black/30 px-3 py-2 text-center"
              >
                <div className="text-[9px] text-zinc-600">T{index + 1}</div>
                <div className="text-sm font-medium text-zinc-100">
                  {formatNumber(fahrenheitToCelsius(temp), 1)}
                  <span className="ml-0.5 text-[10px] text-zinc-500">°C</span>
                </div>
                <div className="text-[10px] text-zinc-600">{temp} °F</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
