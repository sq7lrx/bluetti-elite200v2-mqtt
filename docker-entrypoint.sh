#!/bin/bash

# Entrypoint script for the Docker container

set -e

# Utility functions
log_info() {
    echo "[INFO] $1"
}

log_error() {
    echo "[ERROR] $1" >&2
}

log_warning() {
    echo "[WARNING] $1" >&2
}

# Check the required environment variables
if [ -z "$BLUETTI_MAC" ]; then
    log_error "BLUETTI_MAC is not set"
    exit 1
fi

if [ -z "$MQTT_HOST" ]; then
    log_error "MQTT_HOST is not set"
    exit 1
fi

# Check that the key file exists
#
# Note: the bridge does not read this file. Encryption is self-contained in
# bluetti_mqtt/bluetooth/encryption.py, which uses well-known keys and detects
# encrypted devices from the BLE advertisement. The check is kept as a warning
# only, so a missing file never blocks startup.
if [ -n "$ENCRYPTION_KEY_FILE" ] && [ ! -f "$ENCRYPTION_KEY_FILE" ]; then
    log_warning "Encryption key file not found: $ENCRYPTION_KEY_FILE (not required)"
fi

# Build the command arguments
ARGS="--broker $MQTT_HOST"

if [ -n "$MQTT_PORT" ] && [ "$MQTT_PORT" != "1883" ]; then
    ARGS="$ARGS --port $MQTT_PORT"
fi

if [ -n "$MQTT_USERNAME" ]; then
    ARGS="$ARGS --username $MQTT_USERNAME"
fi

if [ -n "$MQTT_PASSWORD" ]; then
    ARGS="$ARGS --password $MQTT_PASSWORD"
fi

if [ -n "$POLLING_INTERVAL" ]; then
    ARGS="$ARGS --interval $POLLING_INTERVAL"
fi

if [ -n "$HA_CONFIG" ]; then
    ARGS="$ARGS --ha-config $HA_CONFIG"
fi

if [ "$VERBOSE" = "true" ]; then
    ARGS="$ARGS -v"
fi

# Append the MAC address
ARGS="$ARGS $BLUETTI_MAC"

log_info "Starting the Bluetti MQTT Bridge..."
log_info "MAC: $BLUETTI_MAC"
log_info "MQTT Host: $MQTT_HOST:$MQTT_PORT"
log_info "Encryption Keys: $ENCRYPTION_KEY_FILE"

# Run the command matching the first argument
case "$1" in
    bluetti-mqtt)
        log_info "Running: python -m bluetti_mqtt.server_cli $ARGS"
        exec python -m bluetti_mqtt.server_cli $ARGS
        ;;
    bluetti-discovery)
        log_info "Running device discovery..."
        exec python -m bluetti_mqtt.discovery_cli --scan
        ;;
    bluetti-logger)
        if [ -z "$LOG_FILE" ]; then
            LOG_FILE="/app/logs/bluetti.log"
        fi
        log_info "Running the logger: $LOG_FILE"
        exec python -m bluetti_mqtt.logger_cli --log "$LOG_FILE" "$BLUETTI_MAC"
        ;;
    test-connection)
        log_info "Testing the connection to the device..."
        exec python /app/tools/test_connection.py "$BLUETTI_MAC"
        ;;
    verify-keys)
        log_info "Verifying the encryption keys..."
        exec python /app/tools/verify_keys.py "$BLUETTI_MAC"
        ;;
    bash|sh)
        log_info "Starting an interactive shell..."
        exec "$@"
        ;;
    *)
        log_info "Running custom command: $@"
        exec "$@"
        ;;
esac
