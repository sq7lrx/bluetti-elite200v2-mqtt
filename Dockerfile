# Dockerfile for the Bluetti Elite 200 V2 MQTT Bridge

FROM python:3.11-slim

# Metadata
LABEL maintainer="Bluetti Elite 200 V2 Community"
LABEL description="MQTT bridge for Bluetti Elite 200 V2 power station"
LABEL version="1.0.0"

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

# Install the system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    bluetooth \
    bluez \
    libbluetooth-dev \
    libffi-dev \
    libssl-dev \
    pkg-config \
    build-essential \
    rustc \
    cargo \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN groupadd -r bluetti && useradd -r -g bluetti bluetti

# Working directory
WORKDIR /app

# Copy the dependency files
COPY requirements.txt .

# Install the Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY bluetti_mqtt/ ./bluetti_mqtt/
COPY tools/ ./tools/
COPY setup.py pyproject.toml ./
COPY README.md ./

# Install the application
RUN pip install -e .

# Create the configuration directories
RUN mkdir -p /app/config /app/logs

# Change the file ownership
RUN chown -R bluetti:bluetti /app

# Switch to the non-root user
USER bluetti

# Volumes for configuration and logs
VOLUME ["/app/config", "/app/logs"]

# Default port (not used directly, but informative)
EXPOSE 1883

# Default environment variables
ENV BLUETTI_MAC=""
ENV MQTT_HOST=""
ENV MQTT_PORT=1883
ENV MQTT_USERNAME=""
ENV MQTT_PASSWORD=""
ENV MQTT_TOPIC="bluetti"
ENV LOG_LEVEL="info"
ENV ENCRYPTION_KEY_FILE="/app/config/encryption_keys.json"

# Entrypoint script
COPY docker-entrypoint.sh /app/
USER root
RUN chmod +x /app/docker-entrypoint.sh
USER bluetti

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["bluetti-mqtt"]