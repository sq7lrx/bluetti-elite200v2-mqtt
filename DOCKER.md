# Running with Docker

The Compose stack runs everything you need as three services:

| Service | Image | Role |
| --- | --- | --- |
| `mosquitto` | `eclipse-mosquitto:2` | MQTT broker, published on `127.0.0.1:1883` |
| `bluetti-mqtt` | built from `./Dockerfile` | Bluetooth bridge, publishes device state to MQTT |
| `dashboard` | built from `./dashboard/Dockerfile` | Live web UI on <http://localhost:8787> |

Two extra services (`bluetti-discovery` and `bluetti-logger`) sit behind Compose
profiles and only start when you ask for them.

## Requirements

- Docker with the Compose plugin (`docker compose`, v2)
- **Linux host.** The bridge needs `network_mode: host` plus D-Bus access to talk
  to BlueZ. Docker Desktop on macOS and Windows cannot pass Bluetooth through,
  so run the bridge natively there.
- A Bluetooth adapter, with the power station powered on and in range

You do **not** need an `encryption_keys.json` file. Encryption is self-contained
in `bluetti_mqtt/bluetooth/encryption.py`, which detects encrypted devices from
the BLE advertisement and uses well-known keys.

## Quick start

```bash
cp .env.example .env
# set BLUETTI_MAC, and optionally MQTT_USERNAME / MQTT_PASSWORD
docker compose up -d
```

Then open <http://localhost:8787>.

Don't know the MAC address? Run a scan first:

```bash
docker compose --profile discovery up bluetti-discovery
```

### Using the published bridge image

`docker-compose.prebuilt.yml` is identical but pulls
`ghcr.io/sq7lrx/bluetti-elite200v2-mqtt:latest` instead of building the bridge.
The dashboard has no published image yet, so it is still built locally.

```bash
docker compose -f docker-compose.prebuilt.yml up -d
```

## Configuration

Everything is driven by the `.env` file next to the Compose file — no values are
hardcoded in the YAML, which also keeps the `check-private-data` pre-commit hook
happy.

| Variable | Default | Purpose |
| --- | --- | --- |
| `BLUETTI_MAC` | *(required)* | Device MAC address; Compose fails fast if unset |
| `MQTT_PORT` | `1883` | Host port for the broker |
| `MQTT_USERNAME` / `MQTT_PASSWORD` | *(empty)* | Broker credentials; empty means anonymous |
| `MQTT_TOPIC` | `bluetti` | Topic root |
| `POLLING_INTERVAL` | `5` | Seconds between device polls |
| `HA_CONFIG` | `normal` | Home Assistant discovery: `normal`, `none`, `advanced` |
| `LOG_LEVEL` / `VERBOSE` | `info` / `false` | Bridge logging |
| `DASHBOARD_PORT` | `8787` | Host port for the web UI |
| `DASHBOARD_HISTORY_POINTS` | `360` | In-memory history samples (1/second) |

### Broker credentials

`mosquitto/docker-entrypoint.sh` generates the broker config at startup from the
same variables:

- With `MQTT_USERNAME` and `MQTT_PASSWORD` set, it creates a password file and
  sets `allow_anonymous false`.
- With both empty it allows anonymous access and logs a warning.

Either way the port is published on `127.0.0.1` only, so the broker is not
exposed to your LAN. To share it with Home Assistant on another host, change the
mapping in `docker-compose.yml`:

```yaml
    ports:
      - "1883:1883"
```

and set credentials before doing so.

## How the services reach each other

This trips people up, so it is worth stating plainly:

- The **bridge** runs with `network_mode: host` (required for Bluetooth), so it
  is *not* on the Compose network and cannot resolve the name `mosquitto`. It
  connects to `127.0.0.1:1883`, the broker's published port.
- The **dashboard** is on the Compose bridge network and connects to
  `mosquitto:1883` by service name.

That is why `MQTT_HOST` is set per-service in the Compose file rather than in
`.env`.

## Everyday commands

```bash
docker compose ps                     # status
docker compose logs -f bluetti-mqtt   # bridge logs
docker compose logs -f dashboard      # dashboard logs
docker compose restart bluetti-mqtt   # restart just the bridge
docker compose down                   # stop everything
docker compose down -v                # stop and drop broker persistence
docker compose up -d --build          # rebuild after code changes
```

Inspect the MQTT traffic directly:

```bash
docker compose exec mosquitto mosquitto_sub -t 'bluetti/#' -v
```

## Optional services

```bash
# Scan for nearby Bluetti devices
docker compose --profile discovery up bluetti-discovery

# Capture raw protocol traffic to ./logs/device.log
docker compose --profile logger up bluetti-logger
```

## Troubleshooting

**The bridge cannot find the device**

Confirm the host can see it, and that nothing else holds the connection — the
power station accepts only one BLE client at a time, so the phone app or a
locally running bridge will block the container.

```bash
docker compose --profile discovery up bluetti-discovery
bluetoothctl devices
```

**`Permission denied` or D-Bus errors**

The bridge needs `privileged: true` and the D-Bus socket, both already set in
the Compose file. Check that the host's Bluetooth service is running:

```bash
systemctl status bluetooth
```

**The dashboard shows "Waiting for the first MQTT message"**

The UI is connected to the broker but no device state has arrived. Check the
bridge logs and confirm it is publishing:

```bash
docker compose logs -f bluetti-mqtt
docker compose exec mosquitto mosquitto_sub -t 'bluetti/state/#' -v -C 5
```

**MQTT shows as down in the dashboard header**

Credentials most likely disagree. The broker, bridge and dashboard all read
`MQTT_USERNAME` / `MQTT_PASSWORD` from `.env`, so change them in one place and
run `docker compose up -d` again.

**No hardware to hand**

Start only the broker and dashboard, then feed them synthetic data:

```bash
docker compose up -d mosquitto dashboard
node dashboard/tools/simulate.js
```

## Running the dashboard image on its own

```bash
docker build -t bluetti-dashboard ./dashboard
docker run --rm -p 8787:8787 \
  -e MQTT_HOST=192.0.2.10 \
  -e MQTT_USERNAME=... -e MQTT_PASSWORD=... \
  bluetti-dashboard
```
