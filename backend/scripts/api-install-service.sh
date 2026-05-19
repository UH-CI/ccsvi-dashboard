#!/usr/bin/env bash
# Install ccsvi-api as a systemd service.
# Run once on VM after the venv and database are set up.
set -euo pipefail

REPO_ROOT="/home/ubuntu/ccsvi-dashboard"
BACKEND_DIR="$REPO_ROOT/backend"
VENV_PYTHON="$BACKEND_DIR/.venv/bin/python"

if [[ -f "$REPO_ROOT/.env" ]]; then
    set -a
    source "$REPO_ROOT/.env"
    set +a
fi

DATABASE_URL=${DATABASE_URL:?Need DATABASE_URL set in $REPO_ROOT/.env}

if [[ ! -x "$VENV_PYTHON" ]]; then
    echo "ERROR: venv not found at $BACKEND_DIR/.venv"
    echo "Run: cd $BACKEND_DIR && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Write env file
sudo tee /etc/ccsvi-api.env > /dev/null <<EOF
DATABASE_URL=${DATABASE_URL}
EOF
sudo chmod 600 /etc/ccsvi-api.env

sudo tee /etc/systemd/system/ccsvi-api.service > /dev/null <<EOF
[Unit]
Description=CCSVI FastAPI server
After=network.target docker.service
StartLimitIntervalSec=60
StartLimitBurst=5

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$BACKEND_DIR
EnvironmentFile=/etc/ccsvi-api.env
ExecStart=$VENV_PYTHON -m uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable ccsvi-api
sudo systemctl restart ccsvi-api

echo ""
echo "Service installed and started. Status:"
systemctl status ccsvi-api --no-pager