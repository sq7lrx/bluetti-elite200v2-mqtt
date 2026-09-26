# AGENTS.md

Two-part project: an async **Python MQTT bridge** (`bluetti_mqtt/`) that reads a Bluetti Elite 200 V2 over Bluetooth, and a **React/Vite dashboard** (`dashboard/`). The dashboard is currently **untracked** on the `dashboard` branch — check `git status` before destructive git ops.

## Environment
- Local Python venv is **`.venv/`** (Python 3.14). The README says `venv` but the real dir is `.venv`.
- `.venv` has only runtime deps (`aiomqtt`, `bleak`, `crcmod`, `cryptography`, `pyasn1`). `pytest`, `pytest-cov`, `flake8`, `mypy`, `black` are **not** installed — `pip install -r requirements-dev.txt` before testing/linting.
- CI tests Python **3.10–3.13** only; local 3.14 is outside the CI matrix.
- The container runtime here is **podman**, not docker (`docker` is not on PATH, and there is no `docker compose`). `podman build` works for validating Dockerfiles; note it warns that `HEALTHCHECK` is ignored for OCI-format images.

## Running the bridge
- `python -m bluetti_mqtt.server_cli --broker <host> <MAC>` (optional: `--port`, `--username`, `--password`, `--interval`, `-v`, `--ha-config {normal,none,advanced}`). Needs a BLE adapter and the device on + nearby.
- Scan: `python -m bluetti_mqtt.discovery_cli --scan`. Capture: `python -m bluetti_mqtt.logger_cli --log capture.log <MAC>`.
- Config comes from **CLI args, not `.env`**. The root `.env` is read by Docker Compose, `docker-entrypoint.sh`, and the dashboard Node server/simulator; the Python code reads only the `DEBUG` env var.
- Encryption is **self-contained**: `bluetti_mqtt/bluetooth/encryption.py` uses hardcoded well-known test keys and auto-detects encrypted vs. plain devices from BLE ad data. `encryption_keys.json` / `ENCRYPTION_KEY_FILE` are **never read by any code** — don't hunt for key-file handling, and don't reintroduce startup checks that require the file.

## Working with the real device
- **Only one BLE client at a time.** The bridge, `probe_registers.py`, `readregister_cli` and the phone app all contend for the single connection. Stop the bridge before probing, and restart it afterwards.
- Killing the bridge with `pkill -f "bluetti_mqtt.server_cli"` **also kills your own shell**, because the pattern matches the shell's own command line. Use a pattern that cannot match itself, e.g. `pgrep -f "bluetti_mqtt[.]server_cli" | xargs -r kill -INT`.
- `readregister_cli` reports `Ready` before BLE service discovery finishes, so scripted reads fail with `BleakError('Service Discovery has not been performed yet')`. Use **`tools/probe_registers.py`** instead: it waits for readiness, sleeps to let the encrypted session settle, paces reads and retries.
- Reading past the end of a register block returns `ModbusError(... ): 2` (illegal data address). Binary-search the length: a block that fails at 32 but works at 20 is exactly 20 registers long.
- The dashboard server keeps the last value of every field forever. After removing a field from the bridge, **restart the dashboard server** or its stale value lingers in `/api/state`.

## Register-map conventions (`core/devices/`)
- `V2Device` uses `DeviceStruct(chunk_size=1)`, so **field addresses are byte offsets**, not register indices: `HOME_DATA + 4` is the third 16-bit register. When reading a raw dump, word index `i` corresponds to field address `base + 2*i`.
- `Uint32Field` is **word-swapped**: value = `second_word << 16 | first_word`.
- `polling_commands` quantities are in **registers**. A field beyond the quantity is silently dropped — `HOME_DATA` polled 67 registers while three mapped fields lived past it, so they never reported. Always check that the quantity covers the highest mapped offset.
- Decimal scales are guessable from siblings: all the energy counters on `HOME_DATA` are scale 1, so a raw 404 is 40.4 kWh.
- **Validate a mapping before trusting it.** Good evidence: a value matching a known field from another block; `P = V * I` reconciling; a reading changing when you change the physical setup. Beware `uint8` fields at odd offsets — they silently read the low byte of a `uint16` (this made two fields publish a bogus `148`).
- Prefer deleting a field over shipping a misleading name. Several upstream names are wrong for this device (`pv_to_ac_power` was not a power; the "feedback" counters cannot be grid export on a portable unit). Record the probe evidence in a comment where you disable something.

## Architecture
- `server_cli.py` wires up three asyncio tasks: `EventBus` (`bus.py`), `MQTTClient` (`mqtt_client.py`, owns HA discovery + topic layout), and `DeviceHandler` (`device_handler.py`, which drives `MultiDeviceManager` → per-device `BluetoothClient`).
- Protocol lives in `bluetti_mqtt/bluetooth/` (GATT read/write, Modbus-over-BLE, encryption). Register/field definitions are in `core/commands.py`; per-device classes in `core/devices/` (AC200M, AC300, AC500, EP600, V2, …). It supports **several** Bluetti models, not just Elite 200 V2.
- MQTT topics: state `bluetti/state/<device>/<field>`, commands `bluetti/command/<device>/<field>`, HA discovery `homeassistant/...`.
- `_handle_message` publishes **every** parsed field. `NORMAL_DEVICE_FIELDS` now only controls Home Assistant discovery and command handling; anything else is serialized by `_stringify` and published as state-only. Adding a field to a device class is enough to get it onto MQTT.
- The device id in topics is `<type>-<sn>`, and **the type contains spaces** (`Elite 200 V2-2545115936760`). Anything parsing these topics must allow spaces — `COMMAND_TOPIC_RE` used `\w+` and silently rejected every command.

## Dashboard
- `cd dashboard && npm install`, then `npm run dev` (Vite on :5173 proxying `/api`+`/ws` to a Node backend on :8787). `npm run build` = `tsc -b && vite build`; `npm start` serves the built app on :8787.
- `npm run lint` is just `tsc -b --noEmit` (no ESLint configured). `noUnusedLocals` is on, so dead variables break the build.
- Architecture: `server/index.js` subscribes to `bluetti/state/+/+`, keeps latest values plus a 1 Hz rolling history, and pushes deltas over a WebSocket; the browser never speaks MQTT, so the broker needs no WebSocket listener. Commands flow back over the same socket.
- `src/fields.ts` is the display catalog (label/unit/group/precision). Unknown fields still render, under the "Other" group of the data table.
- No hardware? `node dashboard/tools/simulate.js` publishes synthetic telemetry to the broker so the whole UI can be exercised.
- Tailwind v4 is configured via the `@tailwindcss/vite` plugin and `@import "tailwindcss"` — there is **no `tailwind.config.js`**.
- SVG gotchas hit in this repo: CSS `transform: translateX(%)` is unreliable on SVG elements (use user-unit `px`, and translate by exactly one wave period to loop seamlessly); animating a dash-offset highlight around a progress ring makes it travel over the *unfilled* track too.

## Image assets
- ImageMagick `-trim` compares **full RGBA**, so transparent pixels with differing RGB values are treated as content and nothing gets trimmed. `-threshold 0` whitens everything. To crop reliably, dump raw bytes (`magick in.png -depth 8 RGBA:out.raw`), compute the alpha bounding box in Python, and slice.

## Tests / lint
- Tests: `python -m pytest` (only `tests/test_tools.py` exists, covering the license-conversion tool). Single test: `python -m pytest tests/test_tools.py::TestConvertLicense -v`.
- pyproject `addopts` include `--cov`, so bare `pytest` fails without `pytest-cov` installed.
- CI's hard-fail lint is `flake8 . --select=E9,F63,F7,F82` (syntax/undefined names); full `flake8 --max-line-length=88 --extend-ignore=E203,W503` is non-blocking. Bandit/pip-audit never block the build.
- Style: black + isort (black profile, line 88). Don't run `mypy` on the whole repo (strict config, but the codebase isn't fully typed) — it's meant to run per-file via pre-commit.

## Docker
- `docker-compose.yml` runs three services: `mosquitto` (broker), `bluetti-mqtt` (bridge) and `dashboard`. `bluetti-discovery` and `bluetti-logger` sit behind the `discovery` / `logger` profiles.
- **Networking asymmetry that matters:** the bridge uses `network_mode: host` (required for BlueZ/D-Bus) so it is *not* on the Compose network and cannot resolve `mosquitto`; it uses `127.0.0.1:1883` via the published port. The dashboard *is* on the Compose network and uses `mosquitto:1883`. Hence `MQTT_HOST` is set per-service in YAML, not in `.env`.
- The broker port is published on `127.0.0.1` only. `mosquitto/docker-entrypoint.sh` generates the config at runtime and writes it to `/tmp` (the image's `/mosquitto/config` is root-owned while the broker runs as an unprivileged user); it enables auth automatically when `MQTT_USERNAME`/`MQTT_PASSWORD` are set.
- Compose files must take values from `.env` via `${VAR}` — hardcoded broker credentials fail the pre-commit hook (see below).
- Bluetooth passthrough is **Linux-only**; Docker Desktop on macOS/Windows cannot run the bridge.

## Guardrails
- **Never commit real device data.** A pre-commit `check-private-data` hook hard-fails on a specific MAC, the key/token hex strings, an internal IP, and the broker credentials — see the pattern list in `.pre-commit-config.yaml` rather than repeating the values here. `encryption_keys.json`, `.env`, `*.key/*.pem/*.csv`, and capture logs are gitignored — keep them local. Real MAC addresses and probe dumps belong in commit-free scratch space, not in source or docs.
- **The hook does not cover Markdown.** `files:` lists `md`, but `exclude:` contains `.*\.md`, so the two cancel out and no `.md` file is ever scanned. `AGENTS.md`, `README.md`, `DOCKER.md` and `CHANGELOG.md` are unprotected — check them by hand. Fixing the exclude would make the hook flag existing prose, so it is a deliberate decision, not an oversight to "fix" blindly.
- `.pre-commit-config.yaml` is itself in scope (`.yaml`) and contains the patterns as literals, so the hook fails on its own config whenever you edit that file. Use `git commit --no-verify` for that one file, or skip the hook with `SKIP=check-private-data`.
- Remotes: `origin` = this repo (sq7lrx fork); `upstream` = `JordiGrasvi/bluetti-elite200v2-mqtt` (the base this fork builds on). Fork/branch/PR flow per `CONTRIBUTING.md`.
- Packaging: `python -m build` uses `pyproject.toml` + setuptools_scm (version from `v*` git tags). `setup.py` is a legacy duplicate pinning `1.0.0` — pyproject is the source of truth for CI builds.
