# Shared folders, names and passwords for every VM script. Source it, don't run it.

OPS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$OPS_DIR/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
PYTHON="$BACKEND_DIR/.venv/bin/python"

# Sets DATA_ROOT, DATA_VERSION and TILE_CACHE_DIR
source "$BACKEND_DIR/settings.conf"
DATA_DIR="$DATA_ROOT/$DATA_VERSION"
RAW_DIR="$DATA_ROOT/archived/raw_files"
CENSUS_CLEANED_DIR="$DATA_ROOT/archived/cleaned-data"

PG_CONTAINER=ccsvi-pg
DB_NAME=ccsvi
DB_USER=ccsvi
WEB_ROOT=/var/www/ccsvi

if [[ -f "$REPO_ROOT/.env" ]]; then
    set -a
    source "$REPO_ROOT/.env"
    set +a
fi

# Without ON_ERROR_STOP, psql exits 0 even after a failed statement
psql_run() {
    docker exec -i "$PG_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME"
}
