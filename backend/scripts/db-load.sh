#!/usr/bin/env bash
# Load data from source files into Postgres.
# Re-run when CSVs or metrics JSON are updated.
set -euo pipefail

DB_NAME=ccsvi
DB_USER=ccsvi
DB_PASS=${POSTGRES_PASSWORD:?Need POSTGRES_PASSWORD set}
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPTS_DIR/.."

cd "$BACKEND_DIR"

echo "Loading vulnerability CSVs..."
DATABASE_URL="$DATABASE_URL" python3 -m ingest.load_csv

echo "Loading census metrics..."
DATABASE_URL="$DATABASE_URL" python3 -m ingest.load_metrics

echo "Done."