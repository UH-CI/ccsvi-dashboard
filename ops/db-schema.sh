#!/usr/bin/env bash
# Apply SQL schema files to Postgres. Safe to re-run (uses IF NOT EXISTS).
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

INIT_DIR="$BACKEND_DIR/db/init"

shopt -s nullglob
files=("$INIT_DIR"/*.sql)
shopt -u nullglob

if [ ${#files[@]} -eq 0 ]; then
    echo "No .sql files found in $INIT_DIR" >&2
    exit 1
fi

for file in "${files[@]}"; do
    echo "Applying $(basename "$file")..."
    psql_run < "$file"
done

echo "Schema applied (${#files[@]} files)."
