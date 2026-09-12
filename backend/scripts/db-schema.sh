#!/usr/bin/env bash
# Apply SQL schema files to Postgres. Safe to re-run (uses IF NOT EXISTS).
set -euo pipefail

CONTAINER=ccsvi-pg
DB_NAME=ccsvi
DB_USER=ccsvi

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INIT_DIR="$SCRIPTS_DIR/../db/init"

shopt -s nullglob
files=("$INIT_DIR"/*.sql)
shopt -u nullglob

if [ ${#files[@]} -eq 0 ]; then
    echo "No .sql files found in $INIT_DIR" >&2
    exit 1
fi

for file in "${files[@]}"; do
    echo "Applying $(basename "$file")..."
    # Without ON_ERROR_STOP, psql exits 0 even after a failed statement
    docker exec -i "$CONTAINER" \
        psql -v ON_ERROR_STOP=1 -U "$DB_USER" "$DB_NAME" < "$file"
done

echo "Schema applied (${#files[@]} files)."
