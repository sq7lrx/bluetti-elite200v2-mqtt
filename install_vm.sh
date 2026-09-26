#!/bin/bash
# Bluetti MQTT Bridge installation script for a Debian/Ubuntu VM
set -e

# 1. Update the packages
apt update && apt upgrade -y

# 2. Install Docker and Docker Compose
apt install -y docker.io docker-compose

# 3. Install Python, BlueZ and utilities
apt install -y python3 python3-pip bluez

# 4. Grant permissions on the Bluetooth device (if it exists)
if [ -e /dev/hci0 ]; then
  chmod 666 /dev/hci0
fi

# 5. Start the Bluetooth service
systemctl enable bluetooth
systemctl start bluetooth

# 6. Check the Bluetooth device
hciconfig -a || echo "/dev/hci0 was not found. Check the USB passthrough."

# 7. Create the project folders if they do not exist
mkdir -p /root/bluetti
mkdir -p /root/docker

# 8. (Optional) Install the Python dependencies if needed
if [ -f /root/bluetti/requirements.txt ]; then
  pip3 install -r /root/bluetti/requirements.txt
fi

# 9. Start Docker Compose
if [ -f /root/docker/docker-compose.yml ]; then
  docker compose -f /root/docker/docker-compose.yml up -d
else
  echo "/root/docker/docker-compose.yml not found. Copy it before running the script."
fi

# 10. Show the container status
sleep 2
docker ps --format '{{.Names}}'

echo "Installation finished. Check the logs with: docker logs --tail 100 <container_name>"
