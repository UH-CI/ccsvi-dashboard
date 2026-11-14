#!/usr/bin/env bash
# Rebuild database from raw files on VM
# Usage: rebuild.sh [--full]
#   (default) keeps geographies.geom, points, hazards and their overlaps; reloads census data, redoes which area each point is in, point counts and raster values
#   --full    also drops the spatial tables and re-runs load_postgis.py
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

FULL=false
case "${1:-}" in
    --full) FULL=true ;;
    "")     ;;
    *)      echo "Usage: $(basename "$0") [--full]" >&2; exit 1 ;;
esac

: "${DATABASE_URL:?DATABASE_URL is not set; add it to $REPO_ROOT/.env}"

$FULL && echo "== Full rebuild ==" || echo "== Census rebuild (keeping geometry) =="

echo "-- checking generated SQL"
(cd "$BACKEND_DIR" && "$PYTHON" -m db.generate_views --check)

echo "-- checking the layer files"
(cd "$BACKEND_DIR" && "$PYTHON" -m pipeline.check_layers)

echo "-- cleaning the raw census files"
(cd "$BACKEND_DIR" && "$PYTHON" -m ingest.load_cleaned_census --clean-only --output-dir "$CENSUS_CLEANED_DIR")

echo "-- checking the census menu against the cleaned files"
(cd "$BACKEND_DIR" && "$PYTHON" -m pipeline.check_layers --census-files)

echo "-- dropping census tables"
psql_run <<'SQL'
DROP MATERIALIZED VIEW IF EXISTS block_group_metrics;
DROP MATERIALIZED VIEW IF EXISTS hawaiian_homeland_metrics;
DROP TABLE IF EXISTS metric_values, metrics, datasets CASCADE;
SQL

if $FULL; then
    echo "-- dropping spatial tables"
    psql_run <<'SQL'
DROP TABLE IF EXISTS geographies, points, hazards,
    geography_hazards, point_hazards, point_geographies, point_raster_values CASCADE;
SQL
fi

echo "-- applying schema"
"$OPS_DIR/db-schema.sh"

echo "-- loading census data"
cd "$BACKEND_DIR"
"$PYTHON" -m ingest.load_cleaned_census --dir "$CENSUS_CLEANED_DIR"

if $FULL; then
    echo "-- loading geometry, points, hazards"
    "$PYTHON" -m ingest.load_postgis

    echo "-- working out which areas and points touch each hazard layer"
    "$PYTHON" -m ingest.load_hazard_overlaps
fi

echo "-- working out which area each point is in"
"$PYTHON" -m ingest.load_point_areas

echo "-- counting points per block group / Homeland area"
"$PYTHON" -m ingest.load_point_counts

echo "-- reading each raster's value at every point"
"$PYTHON" -m ingest.load_point_raster_values

echo "-- averaging rasters per block group / Homeland area"
"$PYTHON" -m ingest.load_raster_means

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
UNION SELECT 'points',                   count(*) FROM points
UNION SELECT 'hazards',                  count(*) FROM hazards
UNION SELECT 'geography_hazards',        count(*) FROM geography_hazards
UNION SELECT 'point_hazards',            count(*) FROM point_hazards
UNION SELECT 'point_geographies',        count(*) FROM point_geographies
UNION SELECT 'point_raster_values',      count(*) FROM point_raster_values
UNION SELECT 'block_group_metrics',      count(*) FROM block_group_metrics
UNION SELECT 'hawaiian_homeland_metrics', count(*) FROM hawaiian_homeland_metrics
ORDER BY 1;
SQL

echo "Rebuild complete."