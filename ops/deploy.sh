#!/usr/bin/env bash
# Deploy the branch this checkout is on: pull it and restart the API, and on dev also install
# GitHub's website build. Run on the VM. Does not touch the db, rebuild is a separate process.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

RELEASE_URL=https://github.com/UH-CI/ccsvi-dashboard/releases/download/beta/dist.tar.gz

cd "$REPO_ROOT"

BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "-- fetching $BRANCH"
git fetch
BEFORE=$(git rev-parse HEAD)
TARGET=$(git rev-parse "@{u}")

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# GitHub builds the website only for dev
if [[ $BRANCH == dev ]]; then
    echo "-- downloading the website build"
    curl -fsSL "$RELEASE_URL" -o "$TMP/dist.tar.gz"
    mkdir "$TMP/dist"
    tar -xzf "$TMP/dist.tar.gz" -C "$TMP/dist"
    BUILT=$(sed -n 's/^commit: //p' "$TMP/dist/BUILD_INFO")

    # Must match paths-ignore in .github/workflows/build-frontend.yml: changes only there start no build
    if ! git diff --quiet "$BUILT" "$TARGET" -- . \
        ':(exclude)backend' ':(exclude)ops' ':(exclude)notebooks' ':(exclude)*.md'; then
        echo "Website files changed after GitHub's last build (${BUILT:0:7}). Wait for the Build frontend" \
            "run for ${TARGET:0:7} to finish (or check whether it failed), then run this again." >&2
        exit 1
    fi
fi

echo "-- updating to ${TARGET:0:7}"
git merge --ff-only "$TARGET"

if ! git diff --quiet "$BEFORE" HEAD -- backend/requirements.txt; then
    echo "-- installing requirements"
    "$PYTHON" -m pip install -r "$BACKEND_DIR/requirements.txt"
fi

echo "-- restarting ccsvi-api"
sudo systemctl restart ccsvi-api

# systemd returns as soon as the process starts, before uvicorn is listening.
api_healthy() {
    for _ in $(seq 30); do
        curl -fsS http://localhost:8000/api/v1/health > /dev/null && return 0
        sleep 1
    done
    return 1
}
if ! api_healthy; then
    echo "API did not come up — check: journalctl -u ccsvi-api -n 50" >&2
    exit 1
fi

if [[ $BRANCH == dev ]]; then
    echo "-- installing the website to $WEB_ROOT"
    rsync -a --delete "$TMP/dist/" "$WEB_ROOT/"
    curl -fsS -o /dev/null http://localhost/ccsvi-dashboard/
    echo "API at ${TARGET:0:7}, website built from ${BUILT:0:7}"
else
    echo "API at ${TARGET:0:7}. Website not changed: GitHub builds the website only for dev."
fi
