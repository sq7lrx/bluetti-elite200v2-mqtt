# Bluetti Elite 200 V2 MQTT Bridge

[![CI](https://github.com/sq7lrx/bluetti-elite200v2-mqtt/actions/workflows/ci.yml/badge.svg)](https://github.com/sq7lrx/bluetti-elite200v2-mqtt/actions/workflows/ci.yml)
[![Docker](https://img.shields.io/badge/docker-ghcr.io-blue)](https://github.com/sq7lrx/bluetti-elite200v2-mqtt/pkgs/container/bluetti-elite200v2-mqtt)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)

This project provides an MQTT interface for the Bluetti Elite 200 V2 power station, allowing you to read data from the device over Bluetooth and publish it to an MQTT broker for integration with home automation systems such as Home Assistant.

## About this fork

This is a fork of [JordiGrasvi/bluetti-elite200v2-mqtt](https://github.com/JordiGrasvi/bluetti-elite200v2-mqtt), which in turn builds on [warhammerkid/bluetti_mqtt](https://github.com/warhammerkid/bluetti_mqtt). All credit for the original work and for the Elite 200 V2 adaptation goes to the upstream authors.

The fork exists to keep the bridge running on current Python and library versions, and to make the project accessible to a wider audience. Changes compared to upstream:

- **Bleak 3.x compatibility** — the helper tools in `tools/` used `BleakClient.get_services()`, which was removed when service discovery moved into `connect()`. They now read the `BleakClient.services` property.
- **Migration from `asyncio-mqtt` to `aiomqtt` 2.x** — the old library was renamed and its API changed. Messages are now consumed through the `Client.messages` property instead of the removed `filtered_messages()`, and `Message.topic` is converted to a string before it is matched, which previously raised a `TypeError` on every incoming command. This also lifts the upper pin on `paho-mqtt`.
- **Python 3.12+ compatibility** — the server started through `asyncio.get_event_loop()`, which no longer creates a loop implicitly and fails outright on Python 3.14. Startup now runs under `asyncio.run()`.
- **Full translation to English** — documentation, console output, docstrings, comments and shell scripts were translated from Catalan, and a couple of malformed README code blocks were repaired.
- **Refreshed CI** — the workflow now tests on Python 3.10–3.13, uses current action versions, and publishes multi-arch images to `ghcr.io/sq7lrx/bluetti-elite200v2-mqtt`.

Upstream behavior, the MQTT topic layout and the Home Assistant integration are unchanged. The minimum supported Python version is now 3.10, which is what Bleak 3.x requires.

## Acknowledgements

This repository was created thanks to the outstanding work of [warhammerkid](https://github.com/warhammerkid) and his project [bluetti_mqtt](https://github.com/warhammerkid/bluetti_mqtt). I am very grateful for his work, which made this specific adaptation for the Bluetti Elite 200 V2 possible. The original code has served as a solid foundation for developing this specialized version.

## Features

- ✅ Bluetooth connection to the Bluetti Elite 200 V2 power station
- ✅ Data publishing to MQTT
- ✅ Bluetooth encryption support
- ✅ Automatic Home Assistant integration
- ✅ Continuous monitoring of the device status
- ✅ Support for multiple devices simultaneously
- ✅ Live web dashboard (see [`dashboard/`](dashboard/README.md))

## Live dashboard

The [`dashboard/`](dashboard/README.md) directory contains a single-page React dashboard that shows
every value published by the bridge in real time and can toggle the AC/DC outputs. It connects to
the same MQTT broker through a small Node backend, so no broker WebSocket listener is required.

The quickest way to get everything running is the Docker stack, which starts the broker, the bridge
and the dashboard together:

```bash
cp .env.example .env    # set BLUETTI_MAC
docker compose up -d    # http://localhost:8787
```

To run just the dashboard against a broker you already have:

```bash
cd dashboard
npm install
npm run build
npm start   # http://localhost:8787
```

See [DOCKER.md](DOCKER.md) for the full stack reference and [`dashboard/README.md`](dashboard/README.md)
for the UI itself.


## Requirements

- Python 3.10 or later
- BLE-compatible Bluetooth adapter
- MQTT broker (such as Mosquitto)
- Bluetti Elite 200 V2 power station

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/sq7lrx/bluetti-elite200v2-mqtt.git
cd bluetti-elite200v2-mqtt
```

### 2. Create a virtual environment

```bash
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows
```

### 3. Install the dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure the application

Copy the example configuration file:

```bash
cp .env.example .env
```

Edit the `.env` file with your settings:

```bash
# Bluetti device settings
BLUETTI_MAC=XX:XX:XX:XX:XX:XX
ENCRYPTION_KEY_FILE=encryption_keys.json

# MQTT settings
MQTT_HOST=192.168.1.100
MQTT_PORT=1883
MQTT_USERNAME=mqttuser
MQTT_PASSWORD=mqttpass
MQTT_TOPIC=bluetti

# Logging settings
LOG_LEVEL=info
```

## Running with Docker

The recommended setup is the Compose stack, which runs three services together: a Mosquitto broker, the Bluetooth bridge, and the web dashboard.

```bash
cp .env.example .env        # set BLUETTI_MAC
docker compose up -d        # dashboard on http://localhost:8787
```

Don't know the MAC address yet? `docker compose --profile discovery up bluetti-discovery` scans for nearby devices.

The bridge requires a **Linux host**: it needs `network_mode: host` plus the D-Bus socket to reach BlueZ, which Docker Desktop on macOS and Windows cannot provide. No `encryption_keys.json` is needed — encryption is self-contained in the bridge code.

[DOCKER.md](DOCKER.md) covers configuration, credentials, the optional profiles and troubleshooting.

### Container image

This fork publishes its own image, built by the `CI` workflow and pushed to the GitHub Container Registry:

```
ghcr.io/sq7lrx/bluetti-elite200v2-mqtt:latest
```

Multi-architecture images are built for `linux/amd64` and `linux/arm64`. Tags follow the branch and release tags: `latest` for the default branch, `main`, and `1.2.3` / `1.2` for `v*` releases.

The image is built automatically on every push to `main` and on version tags. You can also build it on demand from the **Actions** tab: select the **CI** workflow, click **Run workflow**, and leave *Push the container image to GHCR* enabled to publish the result (disable it for a build-only dry run).

### `docker run`

```bash
docker run -d \
   --name bluetti-mqtt \
   --network host \
   -v /var/run/dbus/system_bus_socket:/var/run/dbus/system_bus_socket:ro \
   -v $(pwd)/config:/app/config \
   -v $(pwd)/logs:/app/logs \
   -e BLUETTI_MAC=XX:XX:XX:XX:XX:XX \
   -e MQTT_HOST=192.168.1.100 \
   -e MQTT_PORT=1883 \
   -e MQTT_USERNAME=user \
   -e MQTT_PASSWORD=password \
   -e MQTT_TOPIC=bluetti \
   -e LOG_LEVEL=info \
   -e ENCRYPTION_KEY_FILE=/app/config/encryption_keys.json \
   ghcr.io/sq7lrx/bluetti-elite200v2-mqtt:latest
```

### Example `docker-compose.yml`

```yaml
services:
   bluetti:
      image: ghcr.io/sq7lrx/bluetti-elite200v2-mqtt:latest
      container_name: bluetti-mqtt
      network_mode: host
      restart: unless-stopped
      environment:
         BLUETTI_MAC: "XX:XX:XX:XX:XX:XX"  # Replace with the real MAC
         MQTT_HOST: "192.168.1.100"
         MQTT_PORT: "1883"
         MQTT_USERNAME: "user"
         MQTT_PASSWORD: "password"
         MQTT_TOPIC: "bluetti"
         LOG_LEVEL: "info"
         ENCRYPTION_KEY_FILE: "/app/config/encryption_keys.json"
      volumes:
         - ./config:/app/config
         - ./logs:/app/logs
         - /var/run/dbus/system_bus_socket:/var/run/dbus/system_bus_socket:ro
```

Then you just need to run:

```bash
docker compose up -d
```

### Security notes
- Do not put sensitive credentials in the repository; use a local `.env` file or a secret manager if needed.
- The `host` mode is the simplest option for BLE + local MQTT. If you want to restrict it, you can try `network_mode: bridge` and expose only the MQTT ports if the container ever acts as a broker (not needed for now).
- The D-Bus socket is mounted read-only (`:ro`).

### Updating the image

```bash
docker compose pull
docker compose up -d --force-recreate
```

To pin an exact version, replace `:latest` with the digest:

```bash
image: ghcr.io/sq7lrx/bluetti-elite200v2-mqtt@sha256:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```


## Configuration

### Finding the device MAC address

To find your Bluetti device's MAC address:

```bash
python -m bluetti_mqtt.discovery_cli --scan
```

This will show all available Bluetti devices:

```
Found AC3001234567890123: address XX:XX:XX:XX:XX:XX
```

### Configuring the encryption keys

**IMPORTANT**: For the security of your device, you will need to obtain the encryption keys specific to your Bluetti Elite 200 V2. These keys are unique to each device and are required to establish secure communication.

#### Method 1: Using the official Bluetti cryptography module

This is the recommended and safest method:

1. **Download the official module**:
   - Visit the official Bluetti website
   - Search for "Bluetti Crypt Module Linux" or contact technical support
   - Download the `Bluetti_Crypt_Module_Linux-X.X.X.tar.gz` file

2. **Extract and install the module**:
   ```bash
   tar -xzf Bluetti_Crypt_Module_Linux-X.X.X.tar.gz
   # Follow the module's installation instructions
   ```

3. **Generate your device's keys**:
   - Use the tools provided by the official module
   - Connect to your Elite 200 V2 device
   - Run the authentication process to obtain the keys

#### Method 2: Bluetooth traffic capture (Advanced)

**Warning**: This method requires advanced technical knowledge and can be complex.

##### For Android:
1. **Enable Bluetooth logging**:
   - Go to `Settings > Developer options`
   - Enable "Bluetooth HCI snoop log"

2. **Capture the traffic**:
   - Install the official Bluetti app
   - Connect to your Elite 200 V2 device
   - Perform some operations (read status, change settings)
   - The log will be saved to `/sdcard/btsnoop_hci.log`

3. **Analyze the traffic**:
   - Transfer the `btsnoop_hci.log` file to your computer
   - Use Wireshark to open and analyze the file
   - Look for the authentication and handshake packets
   - Extract the encryption keys from the captured packets

##### For iOS:
1. **Set up the device for development**:
   - You will need an Apple developer account
   - Install the configuration profile for Bluetooth logging

2. **Capture and analyze**:
   - Similar to the Android process, but using Apple's tools

#### Method 3: Firmware reverse engineering (Very advanced)

**Warning**: This method is for experts only and may void the warranty.

1. **Firmware extraction**:
   - Disassemble the device (voids the warranty)
   - Connect to the flash memory chip
   - Extract the firmware using specialized tools

2. **Firmware analysis**:
   - Use tools such as Ghidra, IDA Pro or Radare2
   - Look for the cryptography and authentication functions
   - Extract the hardcoded keys or the generation algorithm

#### encryption_keys.json file format

Once you have obtained the keys, create the `encryption_keys.json` file with this format:

```json
{
  "XX:XX:XX:XX:XX:XX": {
    "pin": "000000",
    "key": "4a942a522abf710b3c8e61973e3aa17a",
    "token": "45b31b6c213dfcc16059010bb107746aa4dbb51589e9192e1b37dd0422e7e30d0cc071dcdbd3fd720928d65ee0ef8e1a"
  }
}
```

Where:
- `XX:XX:XX:XX:XX:XX`: Your device's MAC address
- `pin`: The device PIN (usually "000000" by default)
- `key`: 32-character hexadecimal encryption key (16 bytes)
- `token`: Authentication token of 64+ hexadecimal characters

#### Verifying the keys

To check that the keys are correct, you can use the included test tool:

```bash
python test_encryption.py
```

If the keys are correct, you should see messages such as:
```
✅ Connection established successfully
✅ Authentication successful
✅ Data decrypted successfully
```

#### Troubleshooting the keys

**Error: "Authentication failed"**
- Check that the MAC address is correct
- Check that the PIN is correct
- Make sure the key is exactly 32 hexadecimal characters

**Error: "Decryption failed"**
- Check that the token is correct and complete
- Check that there are no extra spaces or characters
- Make sure the token is in hexadecimal format

**Error: "Device not found"**
- Check that the device is switched on and nearby
- Check that no other applications are connected
- Restart the system's Bluetooth

**Important note**: The keys shown in this example are fictitious. Every Bluetti device has its own unique keys, which you must obtain using one of the methods described above.

#### Obtaining the device license (Alternative method)

If you have access to the official Bluetti module, you can also generate a device license file:

1. **Generate the license**:
   ```bash
   # Using the official Bluetti module
   ./bluetti_license_generator --device [MAC_ADDRESS] --output bluetti_device_licence.csv
   ```

2. **License file format**:
   ```
   bluetti
   [TIMESTAMP]
   [MD5_KEY]
   [ENCRYPTION_KEY]
   ```

   Where:
   - `TIMESTAMP`: License generation timestamp
   - `MD5_KEY`: 32-character hexadecimal MD5 key
   - `ENCRYPTION_KEY`: Full encryption key (very long)

3. **Conversion to JSON format**:
   If you have the license file, you can convert it to the required JSON format:
   ```bash
   python convert_license.py bluetti_device_licence.csv
   ```

#### Included helper tools

The repository includes several tools to help you obtain and verify the keys:

- `tools/extract_keys.py`: Extracts keys from Bluetooth logs
- `tools/verify_keys.py`: Verifies that the keys are correct
- `tools/convert_license.py`: Converts license files to JSON format
- `tools/test_connection.py`: Tests the connection to the device

## Usage

### Basic execution

```bash
python -m bluetti_mqtt.server_cli --broker [MQTT_BROKER_HOST] [MAC_ADDRESS]
```

### With MQTT authentication

```bash
python -m bluetti_mqtt.server_cli --broker [MQTT_BROKER_HOST] --username [USERNAME] --password [PASSWORD] [MAC_ADDRESS]
```

### With a custom polling interval

```bash
python -m bluetti_mqtt.server_cli --broker [MQTT_BROKER_HOST] --interval 60 [MAC_ADDRESS]
```

### Multiple devices

```bash
python -m bluetti_mqtt.server_cli --broker [MQTT_BROKER_HOST] [MAC_ADDRESS_1] [MAC_ADDRESS_2]
```

## Home Assistant integration

The application supports Home Assistant auto-discovery. The entities will appear automatically in Home Assistant if:

1. Home Assistant is configured to use the same MQTT broker
2. MQTT discovery is enabled (default)

### MQTT topics

- **State**: `bluetti/state/[DEVICE_NAME]/[PROPERTY]`
- **Commands**: `bluetti/command/[DEVICE_NAME]/[PROPERTY]`
- **HA discovery**: `homeassistant/sensor/bluetti_[DEVICE_NAME]/[PROPERTY]/config`

### Available properties

- `battery_percent`: Battery percentage
- `ac_output_power`: AC output power (W)
- `dc_output_power`: DC output power (W)
- `ac_input_power`: AC input power (W)
- `dc_input_power`: DC input power (W)
- `battery_voltage`: Battery voltage (V)
- `battery_current`: Battery current (A)
- `temperature`: Device temperature (°C)

## System service (systemd)

To run the application as a system service:

1. Create the service file:

```bash
sudo nano /etc/systemd/system/bluetti-mqtt.service
```

2. Add the following content:

```ini
[Unit]
Description=Bluetti MQTT Bridge
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
Restart=always
RestartSec=30
TimeoutStopSec=15
User=pi
WorkingDirectory=/home/pi/bluetti-elite200v2-mqtt
ExecStart=/home/pi/bluetti-elite200v2-mqtt/venv/bin/python -m bluetti_mqtt.server_cli --broker 192.168.1.100 XX:XX:XX:XX:XX:XX

[Install]
WantedBy=multi-user.target
```

3. Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable bluetti-mqtt
sudo systemctl start bluetti-mqtt
```

## Development and debugging

### Verbose logging

```bash
python -m bluetti_mqtt.server_cli --broker [MQTT_BROKER_HOST] -v [MAC_ADDRESS]
```

### Data capture for analysis

```bash
python -m bluetti_mqtt.logger_cli --log capture.log [MAC_ADDRESS]
```

### Discovering new registers

```bash
python -m bluetti_mqtt.discovery_cli --log discovery.log [MAC_ADDRESS]
```

## Troubleshooting

### The device does not connect

1. Check that the MAC address is correct
2. Make sure the device is nearby (< 10 meters)
3. Check that no other applications are connected to the device
4. Check the encryption keys

### Authentication errors

1. Check the `encryption_keys.json` file
2. Make sure the keys are correct for your specific device
3. Check that the PIN is correct

### MQTT problems

1. Check connectivity with the MQTT broker
2. Check the authentication credentials
3. Check the topic permissions

## Contributing

Contributions are welcome! Please:

1. Fork the project
2. Create a branch for your feature
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is licensed under the MIT license. See the [LICENSE](LICENSE) file for more details.

## Acknowledgements

- [bluetti_mqtt](https://github.com/warhammerkid/bluetti_mqtt) - Base project for communicating with Bluetti devices
- The Home Assistant developer community
- Bluetti for providing the cryptography module

## Legal notice

This project is not officially affiliated with Bluetti. Use it at your own risk. Improper use may affect your device's warranty.

## Support

If you have problems or questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Search the existing [Issues](https://github.com/sq7lrx/bluetti-elite200v2-mqtt/issues)
3. Create a new issue if you cannot find a solution

---

**Important note about privacy**: This README does not contain any private data. All encryption keys, MAC addresses and credentials shown are examples and must be replaced with your own real data.
