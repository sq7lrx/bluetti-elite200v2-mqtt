# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Live web dashboard in `dashboard/`: a single-page React (Vite + TypeScript + Tailwind) UI with a
  dark theme that shows every published field in real time, with an SOC gauge, animated power-flow
  diagram, rolling power/SOC charts, per-cell battery pack view, a searchable data table and
  AC/DC output controls. A small Node backend bridges MQTT to the browser over WebSocket, so the
  broker does not need a WebSocket listener.
- `dashboard/tools/simulate.js` publishes synthetic telemetry for developing without hardware.
- **Per-cell battery data for the Elite 200 V2.** Register block `PACK_SUB_PACK_INFO` (6300) was
  probed on a real device and is exactly 20 registers long: cell count, temperature sensor count,
  12 cell voltages in mV, and 4 temperatures in Fahrenheit. It is now polled and parsed into
  `cell_voltages`, `pack_cell_count`, `pack_temp_sensor_count` and `pack_temp1`–`pack_temp4`.
- `tools/probe_registers.py` dumps arbitrary register blocks as decoded 16-bit words, waiting for
  the connection to settle and retrying transient BLE errors. Used to map block 6300.
- **Docker Compose stack** running the Mosquitto broker, the Bluetooth bridge and the dashboard
  together (`docker compose up -d`). Adds `dashboard/Dockerfile` (multi-stage Node build) and
  `mosquitto/docker-entrypoint.sh`, which generates the broker config from the same `.env`, and
  enables authentication automatically when credentials are set. The broker port is published on
  `127.0.0.1` only.
- **Solar / DC input detail for the Elite 200 V2.** `INV_PV_INFO` (1200) was never polled. It is
  now, giving `dc_input_voltage1`, `dc_input_current1`, `dc_input_power1`, `pv_num_channels`,
  `pv_channel_online` and `pv_total_chg_energy`. The block's `+4` counter reads 2.1 kWh, exactly
  matching `total_pv_charging_energy` from `HOME_DATA`, which confirmed the base alignment. The
  per-channel offsets (`+24` power, `+26` voltage, `+28` current, both scale 1) were then verified
  against a live 12 V car socket, where 12.3 V x 6.8 A reconciled with the 83 W reported total.

### Changed
- The MQTT client now publishes **every** parsed field, not only those listed in
  `NORMAL_DEVICE_FIELDS`. On the Elite 200 V2 that raises the published field count from 15 to 68,
  adding pack health (`pack_soh`, `pack_avg_temp`, `pack_charging_status`, charge/discharge
  limits, time-to-full/empty), lifetime energy totals, the DC 5V/12V/24V rails and device
  identity. Fields outside the curated list are state-only — Home Assistant discovery is
  unchanged, so no new HA entities appear.
- `docker-compose.yml` and `docker-compose.prebuilt.yml` take all values from `.env` instead of
  hardcoding them. This removes the broker credential literals that the `check-private-data`
  pre-commit hook rejects, and means credentials are configured in exactly one place.

### Fixed
- `internal_ac_frequency` had no source: `INV_INVERTER_INFO` (1500) was never polled, so the AC
  output frequency was permanently absent even with the inverter running. The block is now polled
  and `+0` maps to it (49.9 Hz), alongside `inv_apparent_power` (+20) and `inv_output_current`
  (+24). `+0` holds steady while voltage and current jitter, as expected from a crystal-locked
  inverter, and `+20` reconciles as V x I.
- `COMMAND_TOPIC_RE` never matched devices whose type contains spaces (such as `Elite 200 V2`), so
  every incoming command was rejected as an unknown topic. Device types with spaces and field names
  containing digits are now matched.
- `pack_max_chg_voltage` used a scale of 2, reporting an impossible 4.26 V for a ~39 V pack. It is
  a scale-1 value (42.6 V, i.e. 3.55 V/cell on a 12S pack).
- The `HOME_DATA` poll read only 67 registers, but `pack_dsg_energy_total` (+134), `rate_voltage`
  (+138) and `rate_frequency` (+140) live past that boundary and were parsed out of every
  response. The poll is now 71 registers (probed to 80 without error), so they finally report
  118.2 kWh, 230 V and 50 Hz.
- `pv_to_ac_energy` and `pack_dsg_energy_total` were plain uint32s, publishing 404 and 1181
  instead of the scale-1 values 40.4 kWh and 118.2 kWh their sibling counters use.
- `docker-entrypoint.sh` aborted at startup when `ENCRYPTION_KEY_FILE` was missing, but no bridge
  code ever reads that file — encryption is self-contained. The check is now a warning, so the
  container no longer refuses to start without a key file that serves no purpose.
- Removed three fields that decoded to nonsense on a real Elite 200 V2, each documented in place
  with the probe evidence:
  - `grid_parallel_soc` (uint8 @ +51) and `self_sufficiency_rate` (uint8 @ +129) both read the low
    byte of a uint16 holding 404, publishing `148` as a percentage.
  - `pv_to_ac_power` (+130) read 404 W while PV input and AC output were both 0 W, so it is not a
    power register.

## [1.0.0] - 2024-01-XX

### Added
- Initial support for the Bluetti Elite 200 V2
- Encrypted Bluetooth connection
- Data publishing to MQTT
- Automatic Home Assistant integration
- Helper tools for obtaining the keys
- Complete documentation in English
- Verification and test scripts
- Support for multiple devices
- Configuration via .env files
- systemd service for automatic startup

### Features
- Real-time monitoring of:
  - Battery percentage
  - AC/DC input and output power
  - Battery voltage and current
  - Device temperature
  - Charging/discharging state
- Automatic device discovery
- Configurable logging
- Robust error handling
- Automatic reconnection

### Included tools
- `tools/convert_license.py`: Converts license files to JSON
- `tools/verify_keys.py`: Verifies the encryption keys
- `tools/test_connection.py`: Tests the Bluetooth connection
- `tools/extract_keys.py`: Extracts keys from Bluetooth logs

### Documentation
- Complete README with detailed instructions
- Guides for obtaining the encryption keys
- Configuration examples
- Common troubleshooting
- Step-by-step installation instructions
