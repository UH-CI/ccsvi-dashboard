#!/usr/bin/env bash
# Pull the latest code and restart API. Run on the VM.
# Does not touch the db, rebuild is a separate process.
set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPTS_DIR/.." && pwd)"
REPO_ROOT="$(cd "$BACKEND_DIR/.." && pwd)"
PYTHON="$BACKEND_DIR/.venv/bin/python"

cd "$REPO_ROOT"

BEFORE=$(git rev-parse HEAD)
echo "-- pulling $(git rev-parse --abbrev-ref HEAD)"
git pull --ff-only
AFTER=$(git rev-parse HEAD)

if ! git diff --quiet "$BEFORE" "$AFTER" -- backend/requirements.txt; then
    echo "-- installing requirements"
    "$PYTHON" -m pip install -r "$BACKEND_DIR/requirements.txt"
fi

echo "-- restarting ccsvi-api"
sudo systemctl restart ccsvi-api

# systemd returns as soon as the process starts, before uvicorn is listening.
for _ in $(seq 30); do
    if curl -fsS http://localhost:8000/api/v1/health > /dev/null; then
        echo "API healthy at $(git rev-parse --short HEAD)"
        exit 0
    fi
    sleep 1
done

echo "API did not come up — check: journalctl -u ccsvi-api -n 50" >&2
exit 1
