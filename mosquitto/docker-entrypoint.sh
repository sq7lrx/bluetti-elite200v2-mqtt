#!/bin/sh
# Generates a Mosquitto config from the environment so the whole stack is
# driven by a single .env file.
#
# Both files are written to /tmp because the official image's /mosquitto/config
# is root-owned while the broker runs as the unprivileged "mosquitto" user.
set -eu

CONFIG=/tmp/mosquitto.conf
PASSWD=/tmp/mosquitto.passwd

{
    echo "listener 1883"
    echo "persistence true"
    echo "persistence_location /mosquitto/data/"
    echo "log_dest stdout"
    echo "log_type error"
    echo "log_type warning"
    echo "log_type notice"
} > "$CONFIG"

if [ -n "${MQTT_USERNAME:-}" ] && [ -n "${MQTT_PASSWORD:-}" ]; then
    mosquitto_passwd -c -b "$PASSWD" "$MQTT_USERNAME" "$MQTT_PASSWORD"
    chmod 0600 "$PASSWD"
    echo "allow_anonymous false" >> "$CONFIG"
    echo "password_file $PASSWD" >> "$CONFIG"
    echo "[INFO] Broker requires authentication for user '$MQTT_USERNAME'"
else
    echo "allow_anonymous true" >> "$CONFIG"
    echo "[WARNING] No MQTT_USERNAME/MQTT_PASSWORD set - allowing anonymous access."
    echo "[WARNING] The port is published on 127.0.0.1 only, so this stays local to this host."
fi

exec mosquitto -c "$CONFIG"
