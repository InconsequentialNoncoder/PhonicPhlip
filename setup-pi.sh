#!/bin/bash
# Departure Board — Raspberry Pi Setup Script
# Run this once after copying the project to your Pi.
#
# Usage:
#   chmod +x setup-pi.sh
#   ./setup-pi.sh

set -e

echo "=== Departure Board — Pi Setup ==="
echo ""

# 1. Install Python dependency
echo "[1/4] Installing Python dependencies..."
pip3 install aiohttp --break-system-packages -q 2>/dev/null || pip3 install aiohttp -q
echo "  Done."

# 2. Install Chromium (should already be installed on Pi OS)
echo "[2/4] Checking Chromium..."
if command -v chromium-browser &> /dev/null; then
    echo "  Chromium found."
else
    echo "  Installing Chromium..."
    sudo apt-get update -qq && sudo apt-get install -y -qq chromium-browser
fi

# 3. Create systemd service for the server
echo "[3/4] Creating auto-start service..."
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

sudo tee /etc/systemd/system/departure-board.service > /dev/null << EOF
[Unit]
Description=Departure Board Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/python3 $PROJECT_DIR/server.py
Restart=always
RestartSec=5
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable departure-board.service
sudo systemctl start departure-board.service
echo "  Server service created and started."

# 4. Create auto-start for Chromium in kiosk mode
echo "[4/4] Configuring kiosk display..."
mkdir -p ~/.config/autostart

cat > ~/.config/autostart/departure-display.desktop << EOF
[Desktop Entry]
Type=Application
Name=Departure Display
Comment=Launch departure board in kiosk mode
Exec=bash -c 'sleep 10 && chromium-browser --kiosk --noerrdialogs --disable-infobars --disable-session-crashed-bubble --incognito http://localhost:8080'
X-GNOME-Autostart-enabled=true
EOF

echo ""
echo "=== Setup Complete ==="
echo ""
echo "The server is now running. You can access:"
echo ""
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo "  Display: http://$LOCAL_IP:8080/"
echo "  Control: http://$LOCAL_IP:8080/control"
echo ""
echo "On reboot, the server starts automatically and"
echo "Chromium opens the display in fullscreen kiosk mode."
echo ""
echo "To check server status:  sudo systemctl status departure-board"
echo "To view server logs:     sudo journalctl -u departure-board -f"
echo "To restart server:       sudo systemctl restart departure-board"
