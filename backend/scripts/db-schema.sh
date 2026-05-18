#!/usr/bin/env bash
# Apply SQL schema files to Postgres. Safe to re-run (uses IF NOT EXISTS).
set -euo pipefail

CONTAINER=ccsvi-pg
DB_NAME=ccsvi
DB_USER=ccsvi

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INIT_DIR="$SCRIPTS_DIR/../db/init"

echo "Applying 00_extensions.sql..."
docker exec -i "$CONTAINER" psql -U "$DB_USER" "$DB_NAME" \
    < "$INIT_DIR/00_extensions.sql"

echo "Applying 01_metrics_schema.sql..."
docker exec -i "$CONTAINER" psql -U "$DB_USER" "$DB_NAME" \
    < "$INIT_DIR/01_metrics_schema.sql"

echo "Schema applied."
