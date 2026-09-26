#!/bin/bash

# Automatic installation script for the Bluetti Elite 200 V2 MQTT Bridge
# Usage: curl -sSL https://raw.githubusercontent.com/sq7lrx/bluetti-elite200v2-mqtt/main/install.sh | bash

set -e

# Colors for the output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Utility functions
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Variables
INSTALL_DIR="$HOME/bluetti-elite200v2-mqtt"
VENV_DIR="$INSTALL_DIR/venv"
SERVICE_NAME="bluetti-mqtt"

print_info "Installing the Bluetti Elite 200 V2 MQTT Bridge..."

# Check whether Python 3.10+ is installed
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed. Please install Python 3.10 or later."
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
REQUIRED_VERSION="3.10"

if ! python3 -c "import sys; exit(0 if sys.version_info >= (3, 10) else 1)"; then
    print_error "Python $PYTHON_VERSION detected. Python $REQUIRED_VERSION or later is required."
    exit 1
fi

print_success "Python $PYTHON_VERSION detected"

# Check whether git is installed
if ! command -v git &> /dev/null; then
    print_error "Git is not installed. Please install git first."
    exit 1
fi

# Clone or update the repository
if [ -d "$INSTALL_DIR" ]; then
    print_info "Updating the existing repository..."
    cd "$INSTALL_DIR"
    git pull origin main
else
    print_info "Cloning the repository..."
    git clone https://github.com/sq7lrx/bluetti-elite200v2-mqtt.git "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# Create the virtual environment
print_info "Creating the virtual environment..."
python3 -m venv "$VENV_DIR"

# Activate the virtual environment
source "$VENV_DIR/bin/activate"

# Update pip
print_info "Updating pip..."
pip install --upgrade pip

# Install the dependencies
print_info "Installing the dependencies..."
pip install -r requirements.txt

# Install the package in development mode
print_info "Installing bluetti-mqtt..."
pip install -e .

print_success "Installation complete!"

# Initial configuration
print_info "Configuring the application..."

# Copy the example files if they do not exist yet
if [ ! -f ".env" ]; then
    cp ".env.example" ".env"
    print_info "Created the .env file from the example"
fi

if [ ! -f "encryption_keys.json" ]; then
    cp "encryption_keys.json.example" "encryption_keys.json"
    print_info "Created the encryption_keys.json file from the example"
fi

print_warning "IMPORTANT: Fill in the .env and encryption_keys.json files with your own settings"

# Offer to create a systemd service
echo
read -p "Do you want to create a systemd service to run it automatically? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Creating the systemd service..."
    
    # Ask for the settings
    read -p "Enter the MAC address of the Bluetti device: " MAC_ADDRESS
    read -p "Enter the address of the MQTT broker: " MQTT_BROKER
    
    # Create the service file
    sudo tee "/etc/systemd/system/$SERVICE_NAME.service" > /dev/null <<EOF
[Unit]
Description=Bluetti Elite 200 V2 MQTT Bridge
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
Restart=always
RestartSec=30
TimeoutStopSec=15
User=$USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$VENV_DIR/bin/python -m bluetti_mqtt.server_cli --broker $MQTT_BROKER $MAC_ADDRESS
Environment=PATH=$VENV_DIR/bin

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd and enable the service
    sudo systemctl daemon-reload
    sudo systemctl enable "$SERVICE_NAME"
    
    print_success "systemd service created and enabled"
    print_info "You can start the service with: sudo systemctl start $SERVICE_NAME"
    print_info "View the logs with: sudo journalctl -u $SERVICE_NAME -f"
fi

# Show the final information
echo
print_success "🎉 Installation complete!"
echo
print_info "Next steps:"
echo "1. Edit $INSTALL_DIR/.env with your MQTT configuration"
echo "2. Set up $INSTALL_DIR/encryption_keys.json with the device keys"
echo "3. Test the connection: cd $INSTALL_DIR && $VENV_DIR/bin/python tools/test_connection.py"
echo "4. Run the application: cd $INSTALL_DIR && $VENV_DIR/bin/python -m bluetti_mqtt.server_cli --broker [MQTT_HOST] [MAC_ADDRESS]"
echo
print_info "Full documentation: $INSTALL_DIR/README.md"
print_info "Helper tools available in: $INSTALL_DIR/tools/"

if command -v systemctl &> /dev/null && systemctl is-enabled "$SERVICE_NAME" &> /dev/null; then
    echo
    print_info "systemd service configured. Useful commands:"
    echo "  sudo systemctl start $SERVICE_NAME    # Start the service"
    echo "  sudo systemctl stop $SERVICE_NAME     # Stop the service"
    echo "  sudo systemctl status $SERVICE_NAME   # Service status"
    echo "  sudo journalctl -u $SERVICE_NAME -f   # View logs in real time"
fi
