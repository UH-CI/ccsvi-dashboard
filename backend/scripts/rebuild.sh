#!/usr/bin/env bash
# Rebuild database from raw files on VM
# Usage: rebuild.sh [--full]
#   (default) census side only — keeps geographies.geom, points, hazards
#   --full    also drops the spatial tables and re-runs load_postgis.py
set -euo pipefail

CONTAINER=ccsvi-pg
DB_NAME=ccsvi
DB_USER=ccsvi

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPTS_DIR/.." && pwd)"
PYTHON="$BACKEND_DIR/.venv/bin/python"

FULL=false
case "${1:-}" in
    --full) FULL=true ;;
    "")     ;;
    *)      echo "Usage: $(basename "$0") [--full]" >&2; exit 1 ;;
esac

if [ -z "${DATABASE_URL:-}" ]; then
    echo "DATABASE_URL is not set — export it first" >&2
    exit 1
fi

psql_run() {
    docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME"
}

$FULL && echo "== Full rebuild ==" || echo "== Census rebuild (keeping geometry) =="

echo "-- checking generated SQL"
(cd "$BACKEND_DIR" && "$PYTHON" -m db.generate_views --check)

echo "-- dropping census tables"
psql_run <<'SQL'
DROP MATERIALIZED VIEW IF EXISTS block_group_metrics;
DROP MATERIALIZED VIEW IF EXISTS hawaiian_homeland_metrics;
DROP TABLE IF EXISTS metric_values, metrics, datasets CASCADE;
SQL

if $FULL; then
    echo "-- dropping spatial tables"
    psql_run <<'SQL'
DROP TABLE IF EXISTS geographies, counties, hawaiian_homelands, points, hazards CASCADE;
SQL
fi

echo "-- applying schema"
"$SCRIPTS_DIR/db-schema.sh"

echo "-- loading census data"
cd "$BACKEND_DIR"
"$PYTHON" -m ingest.load_cleaned_census
"$PYTHON" -m ingest.add_mv_column

if $FULL; then
    echo "-- loading geometry, points, hazards"
    "$PYTHON" -m ingest.load_postgis
fi

# The schema step recreates the views while the tables are still empty, so refresh last.
echo "-- refreshing views"
psql_run <<'SQL'
REFRESH MATERIALIZED VIEW block_group_metrics;
REFRESH MATERIALIZED VIEW hawaiian_homeland_metrics;
SQL

echo "-- row counts"
psql_run <<'SQL'
      SELECT 'datasets'                  AS table, count(*) FROM datasets
UNION SELECT 'metrics',                  count(*) FROM metrics
UNION SELECT 'geographies',              count(*) FROM geographies
UNION SELECT 'geographies with geom',    count(*) FROM geographies WHERE geom IS NOT NULL
UNION SELECT 'metric_values',            count(*) FROM metric_values
UNION SELECT 'counties',                 count(*) FROM counties
UNION SELECT 'hawaiian_homelands',       count(*) FROM hawaiian_homelands
UNION SELECT 'points',                   count(*) FROM points
UNION SELECT 'hazards',                  count(*) FROM hazards
UNION SELECT 'block_group_metrics',      count(*) FROM block_group_metrics
UNION SELECT 'hawaiian_homeland_metrics', count(*) FROM hawaiian_homeland_metrics
ORDER BY 1;
SQL

echo "Rebuild complete."