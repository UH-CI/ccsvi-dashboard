#!/usr/bin/env bash
# Install the latest CI frontend build. Run on the VM.
set -euo pipefail

URL=https://github.com/UH-CI/ccsvi-dashboard/releases/download/beta/dist.tar.gz
WEB_ROOT=/var/www/ccsvi

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "-- downloading"
curl -fsSL "$URL" -o "$TMP/dist.tar.gz"

mkdir "$TMP/dist"
tar -xzf "$TMP/dist.tar.gz" -C "$TMP/dist"

echo "-- installing to $WEB_ROOT"
rsync -a --delete "$TMP/dist/" "$WEB_ROOT/"

curl -fsS -o /dev/null http://localhost/ccsvi-dashboard/
cat "$WEB_ROOT/BUILD_INFO"
