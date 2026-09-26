import { useEffect, useMemo, useState } from 'react'
import { Card } from './components/Card'
import { BatteryGauge } from './components/BatteryGauge'
import { BatteryPacks } from './components/BatteryPacks'
import { ChartLegend, PowerChart, SocChart } from './components/Charts'
import { Controls } from './components/Controls'
import { PowerFlow } from './components/PowerFlow'
import { RawTable } from './components/RawTable'
import { StatTile } from './components/StatTile'
import { useBluettiStream } from './useBluettiStream'
import deviceImage from './assets/elite-200-v2.png'
import { formatDuration, formatNumber } from './format'
import type { DeviceState, FieldValue } from './types'

function num(device: DeviceState | undefined, id: string): number | null {
  const value = device?.fields[id]?.value
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

const ENERGY_TILES = [
  { id: 'total_pv_charging_energy', label: 'Solar charged', accent: '#facc15' },
  { id: 'total_grid_charging_energy', label: 'Grid charged', accent: '#38bdf8' },
  { id: 'total_ac_energy', label: 'AC to devices', accent: '#a78bfa' },
  { id: 'total_dc_energy', label: 'DC to devices', accent: '#34d399' },
  { id: 'pack_dsg_energy_total', label: 'Battery discharged', accent: '#22d3ee' },
]

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
        ok
          ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
          : 'border-rose-400/25 bg-rose-400/10 text-rose-300'
      }`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span
          className={`absolute inline-flex h-full w-full rounded-full ${
            ok ? 'animate-ping bg-emerald-400' : 'bg-rose-400'
          }`}
        />
        <span
          className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
            ok ? 'bg-emerald-400' : 'bg-rose-400'
          }`}
        />
      </span>
      {label}
    </span>
  )
}

export default function App() {
  const { connected, mqttConnected, devices, broker, sendCommand } = useBluettiStream()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const device = useMemo(
    () => devices.find((d) => d.id === selectedId) ?? devices[0],
    [devices, selectedId],
  )

  const solar = num(device, 'dc_input_power')
  const grid = num(device, 'ac_input_power')
  const acOut = num(device, 'ac_output_power')
  const dcOut = num(device, 'dc_output_power')
  const percent = num(device, 'total_battery_percent')
  const voltage = num(device, 'total_battery_voltage')
  const current = num(device, 'total_battery_current')

  const charged = (solar ?? 0) + (grid ?? 0)
  const drawn = (acOut ?? 0) + (dcOut ?? 0)
  const netPower = charged - drawn
  const batteryStatus: 'charging' | 'discharging' | 'idle' =
    netPower > 5 ? 'charging' : netPower < -5 ? 'discharging' : 'idle'

  const stale = device ? now - device.lastSeen > 30000 : false
  const solarConnected =
    num(device, 'pv_channel_online') === 1 ||
    (solar ?? 0) > 1 ||
    (num(device, 'dc_input_current1') ?? 0) > 0.1

  const handleCommand = (field: string, value: FieldValue) => {
    if (device) sendCommand(device.id, field, value)
  }

  return (
    <div className="mx-auto min-h-full w-full max-w-[1500px] px-4 pb-12 sm:px-6">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-3 py-6">
        <div className="flex items-center gap-3">
          <img
            src={deviceImage}
            alt="Bluetti Elite 200 V2"
            width={256}
            height={235}
            className="h-12 w-12 shrink-0 object-contain drop-shadow-[0_3px_10px_rgba(0,0,0,0.65)]"
          />
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">
              Bluetti Elite 200 V2
            </h1>
            <p className="text-xs text-zinc-500">
              {device ? device.id : 'waiting for device'}
              {broker ? ` · ${broker.host}:${broker.port}` : ''}
            </p>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {devices.length > 1 && (
            <select
              value={device?.id ?? ''}
              onChange={(event) => setSelectedId(event.target.value)}
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-400/60"
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.id}
                </option>
              ))}
            </select>
          )}
          <StatusPill ok={connected} label={connected ? 'Dashboard live' : 'Reconnecting…'} />
          <StatusPill ok={mqttConnected} label={mqttConnected ? 'MQTT' : 'MQTT down'} />
          {device && (
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] ${
                stale
                  ? 'border-amber-400/25 bg-amber-400/10 text-amber-300'
                  : 'border-white/10 text-zinc-500'
              }`}
            >
              updated {formatDuration(now - device.lastSeen)}
            </span>
          )}
        </div>
      </header>

      {!device ? (
        <Card>
          <div className="flex flex-col items-center gap-2 py-20 text-center">
            <div className="text-3xl">📡</div>
            <p className="text-sm text-zinc-300">Waiting for the first MQTT message…</p>
            <p className="max-w-md text-xs text-zinc-500">
              The dashboard subscribes to <code className="text-zinc-400">bluetti/state/#</code>.
              Make sure <code className="text-zinc-400">bluetti-mqtt</code> is running and connected
              to the same broker.
            </p>
          </div>
        </Card>
      ) : (
        <main className="grid gap-4 lg:grid-cols-12">
          <Card title="State of charge" className="lg:col-span-4">
            <BatteryGauge
              percent={percent}
              voltage={voltage}
              current={current}
              status={batteryStatus}
              netPower={netPower}
            />
          </Card>

          <Card title="Live power flow" subtitle="Inputs → battery → loads" className="lg:col-span-8">
            <PowerFlow
              solar={solar}
              grid={grid}
              acOut={acOut}
              dcOut={dcOut}
              battery={netPower}
              batteryPercent={percent}
              dcVoltage={num(device, 'dc_input_voltage1')}
              dcConnected={solarConnected}
            />

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatTile
                label="Total input"
                value={formatNumber(charged, 0)}
                unit="W"
                accent="#38bdf8"
              />
              <StatTile
                label="To connected devices"
                value={formatNumber(drawn, 0)}
                unit="W"
                accent="#a78bfa"
              />
              <StatTile
                label="Net"
                value={`${netPower > 0 ? '+' : ''}${formatNumber(netPower, 0)}`}
                unit="W"
                accent={netPower >= 0 ? '#34d399' : '#fbbf24'}
              />
            </div>
          </Card>

          <Card
            title="Power history"
            subtitle="Last 6 minutes of 1 s samples"
            action={<ChartLegend />}
            className="lg:col-span-8"
          >
            <PowerChart data={device.history} />
          </Card>

          <Card title="Battery history" className="lg:col-span-4">
            <SocChart data={device.history} />
          </Card>

          <Card title="AC input (grid)" className="lg:col-span-4">
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                label="Power"
                value={grid === null ? '—' : formatNumber(grid, 0)}
                unit="W"
                accent="#38bdf8"
              />
              <StatTile
                label="Voltage"
                value={
                  num(device, 'ac_input_voltage') === null
                    ? '—'
                    : formatNumber(num(device, 'ac_input_voltage')!, 1)
                }
                unit="V"
                accent="#38bdf8"
              />
              <StatTile
                label="Frequency"
                value={
                  num(device, 'ac_input_frequency') === null
                    ? '—'
                    : formatNumber(num(device, 'ac_input_frequency')!, 1)
                }
                unit="Hz"
                accent="#38bdf8"
              />
              <StatTile
                label="Grid charged"
                value={
                  num(device, 'grid_total_chg_energy') === null
                    ? '—'
                    : formatNumber(num(device, 'grid_total_chg_energy')!, 1)
                }
                unit="kWh"
                accent="#38bdf8"
              />
            </div>
          </Card>

          <Card
            title="DC input"
            subtitle="Solar or 12/24 V source"
            action={
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] tracking-wider uppercase ${
                  solarConnected
                    ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
                    : 'border-white/10 text-zinc-600'
                }`}
              >
                {solarConnected ? 'Charging' : 'Not connected'}
              </span>
            }
            className="lg:col-span-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                label="Power"
                value={solar === null ? '—' : formatNumber(solar, 0)}
                unit="W"
                accent="#facc15"
                hint={
                  num(device, 'pv_num_channels') === null
                    ? undefined
                    : `${num(device, 'pv_num_channels')} channel`
                }
              />
              <StatTile
                label="Voltage"
                value={
                  num(device, 'dc_input_voltage1') === null
                    ? '—'
                    : formatNumber(num(device, 'dc_input_voltage1')!, 1)
                }
                unit="V"
                accent="#facc15"
              />
              <StatTile
                label="Current"
                value={
                  num(device, 'dc_input_current1') === null
                    ? '—'
                    : formatNumber(num(device, 'dc_input_current1')!, 1)
                }
                unit="A"
                accent="#facc15"
              />
              <StatTile
                label="Charged in"
                value={
                  num(device, 'pv_total_chg_energy') === null
                    ? '—'
                    : formatNumber(num(device, 'pv_total_chg_energy')!, 1)
                }
                unit="kWh"
                accent="#facc15"
              />
            </div>
          </Card>

          <Card title="Output to devices" className="lg:col-span-4">
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                label="AC to devices"
                value={acOut === null ? '—' : formatNumber(acOut, 0)}
                unit="W"
                accent="#a78bfa"
              />
              <StatTile
                label="DC to devices"
                value={dcOut === null ? '—' : formatNumber(dcOut, 0)}
                unit="W"
                accent="#34d399"
              />
              <StatTile
                label="AC voltage"
                value={
                  num(device, 'internal_ac_voltage') === null
                    ? '—'
                    : formatNumber(num(device, 'internal_ac_voltage')!, 1)
                }
                unit="V"
                accent="#a78bfa"
              />
              <StatTile
                label="AC frequency"
                value={
                  num(device, 'internal_ac_frequency') === null
                    ? '—'
                    : formatNumber(num(device, 'internal_ac_frequency')!, 1)
                }
                unit="Hz"
                accent="#a78bfa"
              />
            </div>
          </Card>

          <Card
            title="Controls"
            subtitle={connected && mqttConnected ? undefined : 'Offline — commands disabled'}
            className="lg:col-span-4"
          >
            <Controls
              device={device}
              disabled={!connected || !mqttConnected}
              onCommand={handleCommand}
            />
          </Card>

          <Card title="Battery health & cells" className="lg:col-span-8">
            <BatteryPacks device={device} />
          </Card>

          <Card title="Lifetime energy" className="lg:col-span-12">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {ENERGY_TILES.map((tile) => {
                const value = num(device, tile.id)
                return (
                  <StatTile
                    key={tile.id}
                    label={tile.label}
                    value={value === null ? '—' : formatNumber(value, 1)}
                    unit="kWh"
                    accent={tile.accent}
                  />
                )
              })}
            </div>
          </Card>

          <Card
            title="All reported data"
            subtitle="Every field published on bluetti/state"
            collapsible
            defaultOpen={false}
            className="lg:col-span-12"
          >
            <RawTable device={device} />
          </Card>
        </main>
      )}

      <footer className="mt-8 text-center text-[11px] text-zinc-600">
        bluetti-elite200v2-mqtt dashboard · data refreshes as the bridge polls over Bluetooth
      </footer>
    </div>
  )
}
