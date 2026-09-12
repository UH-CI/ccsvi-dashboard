-- Spatial tables: county and homeland boundaries, points, hazards.
-- The wide metric views are in 03_metric_views.sql, generated from db/mv_columns.py.


-- ── Static boundary tables ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS counties (
    geoid TEXT PRIMARY KEY,
    name  TEXT,
    geom  geometry(MultiPolygon, 4326)
);
CREATE INDEX IF NOT EXISTS idx_counties_geom ON counties USING GIST (geom);

CREATE TABLE IF NOT EXISTS hawaiian_homelands (
    id   SERIAL PRIMARY KEY,
    name TEXT,
    geom geometry(MultiPolygon, 4326)
);
CREATE INDEX IF NOT EXISTS idx_hawaiian_homelands_geom ON hawaiian_homelands USING GIST (geom);


-- ── Points ───────────────────────────────────────────────────────────────────
-- Union of all 9 point-layer GeoJSONs. layer_id matches IDs in pointLayers.ts.

CREATE TABLE IF NOT EXISTS points (
    id       SERIAL PRIMARY KEY,
    layer_id TEXT NOT NULL,
    name     TEXT,
    props    JSONB,
    geom     geometry(Point, 4326)
);
CREATE INDEX IF NOT EXISTS idx_points_geom     ON points USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_points_layer_id ON points (layer_id);
CREATE INDEX IF NOT EXISTS idx_points_name_fts ON points USING GIN (to_tsvector('english', coalesce(name, '')));


-- ── Hazards ──────────────────────────────────────────────────────────────────
-- Denormalized polygon table for spatial cross-data joins.
-- hazard_id + sub_id mirror IDs in hazardLayers.ts.
-- height_ft is used for SLR layers (0.5, 1.0, 1.5, 2.0).

CREATE TABLE IF NOT EXISTS hazards (
    id        SERIAL  PRIMARY KEY,
    hazard_id TEXT    NOT NULL,
    sub_id    TEXT,
    height_ft NUMERIC,
    zone      TEXT,
    props     JSONB,
    geom      geometry
);
CREATE INDEX IF NOT EXISTS idx_hazards_geom      ON hazards USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_hazards_hazard_id ON hazards (hazard_id);
CREATE INDEX IF NOT EXISTS idx_hazards_sub_id    ON hazards (sub_id);
CREATE INDEX IF NOT EXISTS idx_hazards_height_ft ON hazards (height_ft);
