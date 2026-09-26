# Bluetti Elite 200 V2 — Live Dashboard

A single-page, dark-themed React dashboard that shows every value the MQTT bridge publishes for
your Elite 200 V2, updating live, and lets you toggle the AC/DC outputs.

![stack](https://img.shields.io/badge/react-19-61dafb) ![stack](https://img.shields.io/badge/vite-7-646cff) ![stack](https://img.shields.io/badge/tailwind-4-38bdf8)

## How it works

```
Bluetti (BLE) → bluetti-mqtt → MQTT broker → dashboard/server (Node) → WebSocket → React UI
```

`dashboard/server/index.js` subscribes to `bluetti/state/+/+`, keeps the latest value of every
field plus a rolling history, and pushes changes to the browser over a WebSocket. Commands sent
from the UI are published back to `bluetti/command/<device>/<field>`.

Using a small backend instead of connecting the browser straight to MQTT means you do not have to
enable a WebSocket listener on the broker or expose broker credentials to the browser.

## Quick start

```bash
cd dashboard
npm install
npm run build
npm start
```

Open <http://localhost:8787>.

The server reads MQTT settings from the repository root `.env` (`MQTT_HOST`, `MQTT_PORT`,
`MQTT_USERNAME`, `MQTT_PASSWORD`, `MQTT_TOPIC`). To override anything, copy `.env.example` to
`dashboard/.env`.

### Development

```bash
npm run dev
```

This runs the bridge server on `:8787` and the Vite dev server with hot reload on
<http://localhost:5173>, which proxies `/api` and `/ws` to the backend.

### No hardware? Use the simulator

```bash
node tools/simulate.js
```

It publishes realistic telemetry (including per-cell pack voltages) to your broker so the whole UI
can be exercised without the power station.

## What is shown

| Panel | Contents |
| --- | --- |
| State of charge | Animated SOC ring, pack voltage and current, charge/discharge state |
| Live power flow | Animated diagram of solar/AC in → battery → AC/DC loads, plus input, output, net and lifetime generation totals |
| Power history | Rolling 6-minute chart of all four power channels at 1 s resolution |
| Battery history | Rolling SOC chart |
| AC input (grid) | Grid power, voltage, frequency and lifetime grid charge |
| DC input | Solar or 12/24 V source power, voltage, current, channel count and lifetime charge, with a connected/not-connected badge and an icon that follows the source type |
| Output to devices | AC/DC power delivered to connected devices, internal AC voltage and frequency |
| Controls | Toggles, numeric setters and mode readouts for every writable field the bridge reports |
| Battery health & cells | State of health, cell spread/average, charge and discharge limits, time to full/empty, all 12 cell voltages with bars, and the 4 temperature sensors (shown in °C, raw °F underneath) |
| Lifetime energy | Solar charged, grid charged, AC/DC delivered to devices, battery discharged |
| All reported data | Searchable table of every field on `bluetti/state`, grouped and timestamped (collapsed by default) |

Panels adapt to what the device actually publishes — fields that never arrive are simply not shown
as controls, and any field the dashboard does not know about still appears in the "Other" group of
the data table.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `MQTT_HOST` | `localhost` | Broker hostname |
| `MQTT_PORT` | `1883` | Broker port |
| `MQTT_USERNAME` / `MQTT_PASSWORD` | – | Broker credentials |
| `MQTT_TOPIC` | `bluetti` | Topic root used by the bridge |
| `DASHBOARD_HOST` | `0.0.0.0` | HTTP bind address |
| `DASHBOARD_PORT` | `8787` | HTTP/WebSocket port |
| `DASHBOARD_HISTORY_POINTS` | `360` | Samples retained in memory (1 per second) |

## Docker

The repository ships a Compose stack that runs the broker, the bridge and this
dashboard together. From the repository root:

```bash
cp .env.example .env    # set BLUETTI_MAC
docker compose up -d
```

To build and run only this image:

```bash
docker build -t bluetti-dashboard ./dashboard
docker run --rm -p 8787:8787 -e MQTT_HOST=192.0.2.10 bluetti-dashboard
```

See [DOCKER.md](../DOCKER.md) for the full reference.

## Notes

- History lives in memory only and resets when the server restarts; the bridge and Home Assistant
  remain the source of truth for long-term data.
- The UI reconnects automatically if either the WebSocket or the MQTT connection drops, and shows
  both connection states in the header.
