# Running with Docker

This document explains how to run the Bluetti Elite 200 V2 MQTT Bridge using Docker.

## Requirements

- Docker and Docker Compose installed
- A Bluetooth adapter accessible from the container
- An `encryption_keys.json` file with the device keys

## Quick setup

### Option A: Pre-built image (Recommended)

Use the official image from the GitHub Container Registry:

```bash
# Create the required directories
mkdir -p config logs

# Copy the key file (replace with your real data)
cp encryption_keys.json config/

# Use the docker-compose file for the pre-built image
docker-compose -f docker-compose.prebuilt.yml up -d

# View logs
docker-compose -f docker-compose.prebuilt.yml logs -f

# Stop the application
docker-compose -f docker-compose.prebuilt.yml down
```

### Option B: Local build

Build the image locally from source:

```bash
# Create the required directories
mkdir -p config logs

# Copy the key file
cp encryption_keys.json config/

# Build and run locally
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

### Environment variable configuration

Edit the corresponding docker-compose file and replace:

```yaml
environment:
  - BLUETTI_MAC=E4:B3:23:5B:F5:76    # Your real MAC address
  - MQTT_HOST=192.168.1.100          # Your real MQTT IP
  - MQTT_USERNAME=your_username      # If authentication is required
  - MQTT_PASSWORD=your_password      # If authentication is required
```

## Advanced usage

### Device discovery

```bash
# With the pre-built image
docker-compose -f docker-compose.prebuilt.yml --profile discovery up bluetti-discovery

# With a local build
docker-compose --profile discovery up bluetti-discovery

# Or directly with Docker (pre-built image)
docker run --rm --privileged --network host \
  -v /var/run/dbus:/var/run/dbus:ro \
  --device /dev/bus/usb:/dev/bus/usb \
  ghcr.io/jordigrasvi/bluetti-elite200v2-mqtt:latest bluetti-discovery
```

### Logger mode

```bash
# With the pre-built image
docker-compose -f docker-compose.prebuilt.yml --profile logger up bluetti-logger

# With a local build
docker-compose --profile logger up bluetti-logger
```

### Connection test

```bash
# With the pre-built image
docker run --rm --privileged --network host \
  -v /var/run/dbus:/var/run/dbus:ro \
  --device /dev/bus/usb:/dev/bus/usb \
  -e BLUETTI_MAC=XX:XX:XX:XX:XX:XX \
  ghcr.io/jordigrasvi/bluetti-elite200v2-mqtt:latest test-connection

# With the local image
docker run --rm --privileged --network host \
  -v /var/run/dbus:/var/run/dbus:ro \
  --device /dev/bus/usb:/dev/bus/usb \
  -e BLUETTI_MAC=XX:XX:XX:XX:XX:XX \
  bluetti-elite200v2-mqtt test-connection
```

### Key verification

```bash
# With the pre-built image
docker run --rm --privileged --network host \
  -v ./config:/app/config:ro \
  -v /var/run/dbus:/var/run/dbus:ro \
  --device /dev/bus/usb:/dev/bus/usb \
  -e BLUETTI_MAC=XX:XX:XX:XX:XX:XX \
  ghcr.io/jordigrasvi/bluetti-elite200v2-mqtt:latest verify-keys

# With the local image
docker run --rm --privileged --network host \
  -v ./config:/app/config:ro \
  -v /var/run/dbus:/var/run/dbus:ro \
  --device /dev/bus/usb:/dev/bus/usb \
  -e BLUETTI_MAC=XX:XX:XX:XX:XX:XX \
  bluetti-elite200v2-mqtt verify-keys
```

## Available environment variables

| Variable | Description | Default | Required |
|----------|------------|-------------|------------|
| `BLUETTI_MAC` | Device MAC address | - | ✅ |
| `MQTT_HOST` | MQTT broker host | - | ✅ |
| `MQTT_PORT` | MQTT broker port | 1883 | ❌ |
| `MQTT_USERNAME` | MQTT username | - | ❌ |
| `MQTT_PASSWORD` | MQTT password | - | ❌ |
| `MQTT_TOPIC` | MQTT base topic | bluetti | ❌ |
| `LOG_LEVEL` | Logging level | info | ❌ |
| `POLLING_INTERVAL` | Polling interval (seconds) | 5 | ❌ |
| `HA_CONFIG` | Home Assistant configuration | normal | ❌ |
| `VERBOSE` | Detailed logs | false | ❌ |
| `ENCRYPTION_KEY_FILE` | Path to the key file | /app/config/encryption_keys.json | ❌ |

## Volumes

| Local volume | Container volume | Description |
|-------------|------------------|-------------|
| `./config` | `/app/config` | Configuration files (encryption_keys.json) |
| `./logs` | `/app/logs` | Application logs |

## Troubleshooting

### Error: "No such device"

```bash
# Check that the Bluetooth adapter is accessible
ls -la /dev/bus/usb/

# Make sure the container has privileges
# privileged: true in docker-compose.yml
```

### Error: "Permission denied" for Bluetooth

```bash
# Add the user to the bluetooth group (host)
sudo usermod -a -G bluetooth $USER

# Restart the Docker service
sudo systemctl restart docker
```

### Error: "Device not found"

```bash
# Check that the device is visible
docker run --rm --privileged --network host \
  -v /var/run/dbus:/var/run/dbus:ro \
  --device /dev/bus/usb:/dev/bus/usb \
  bluetti-elite200v2-mqtt bluetti-discovery
```

### Detailed logs

```bash
# Enable detailed logs
docker-compose exec bluetti-mqtt \
  python -m bluetti_mqtt.server_cli --broker $MQTT_HOST -v $BLUETTI_MAC
```

## Custom build

```bash
# Build the image locally
docker build -t bluetti-elite200v2-mqtt .

# With build arguments
docker build --build-arg PYTHON_VERSION=3.11 -t bluetti-elite200v2-mqtt .
```

## Integration with other services

### With Home Assistant (Docker)

```yaml
# Add this to your Home Assistant docker-compose.yml
services:
  homeassistant:
    # ... existing configuration
    
  mosquitto:
    # ... MQTT configuration
    
  bluetti-mqtt:
    image: bluetti-elite200v2-mqtt
    depends_on:
      - mosquitto
    environment:
      - MQTT_HOST=mosquitto
    # ... rest of the configuration
```

### With Portainer

1. Import the `docker-compose.yml` into Portainer
2. Configure the environment variables in the web interface
3. Mount the required volumes
4. Run the stack

## Security

- **Never** include real keys in the repository's configuration files
- Use Docker secrets for sensitive data in production
- Restrict access to the configuration volumes
- Consider using a non-root user inside the container (already configured)
