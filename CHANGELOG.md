# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
