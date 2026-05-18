#!/usr/bin/env bash
# Start the FastAPI server.
set -euo pipefail

DB_NAME=ccsvi
DB_USER=ccsvi
DB_PASS=${POSTGRES_PASSWORD:?Need POSTGRES_PASSWORD set}
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPTS_DIR/.."

cd "$BACKEND_DIR"

echo "Starting API on port 8000 (Ctrl+C to stop)..."
DATABASE_URL="$DATABASE_URL" uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload