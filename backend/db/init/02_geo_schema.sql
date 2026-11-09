-- Spatial tables: points, hazards, hazard overlaps, each point's areas and raster values at points.
-- Area shapes live on geographies (01_schema.sql).
-- The wide metric views are in 03_metric_views.sql, generated from db/mv_columns.py.


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


-- ── Hazards ──────────────────────────────────────────────────────────────────
-- Denormalized polygon table for spatial cross-data joins.
-- hazard_id + sub_id mirror IDs in hazardLayers.ts.

CREATE TABLE IF NOT EXISTS hazards (
    id        SERIAL  PRIMARY KEY,
    hazard_id TEXT    NOT NULL,
    sub_id    TEXT,
    geom      geometry
);
CREATE INDEX IF NOT EXISTS idx_hazards_geom      ON hazards USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_hazards_hazard_id ON hazards (hazard_id);
CREATE INDEX IF NOT EXISTS idx_hazards_sub_id    ON hazards (sub_id);


-- ── Hazard overlaps ──────────────────────────────────────────────────────────
-- Which areas / points touch which hazard layer, worked out once per rebuild by
-- ingest/load_hazard_overlaps.py so filters only look them up.
-- No foreign key to points: load_postgis truncates points, which a reference would block.

CREATE TABLE IF NOT EXISTS geography_hazards (
    geoid     TEXT NOT NULL,
    hazard_id TEXT NOT NULL,
    sub_id    TEXT
);
CREATE INDEX IF NOT EXISTS idx_geography_hazards_geoid  ON geography_hazards (geoid);
CREATE INDEX IF NOT EXISTS idx_geography_hazards_hazard ON geography_hazards (hazard_id, sub_id);

CREATE TABLE IF NOT EXISTS point_hazards (
    point_id  INTEGER NOT NULL,
    hazard_id TEXT    NOT NULL,
    sub_id    TEXT
);
CREATE INDEX IF NOT EXISTS idx_point_hazards_hazard ON point_hazards (hazard_id, sub_id);

-- ── Each point's areas ───────────────────────────────────────────────────────
-- Which block group / Homeland area each point is in, worked out once per rebuild by
-- ingest/load_point_areas.py. A point can be in both kinds of area, or in none.
-- No foreign key to points, for the same reason as point_hazards.

CREATE TABLE IF NOT EXISTS point_geographies (
    point_id INTEGER NOT NULL,
    geoid    TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_point_geographies_point ON point_geographies (point_id);
CREATE INDEX IF NOT EXISTS idx_point_geographies_geoid ON point_geographies (geoid);

-- ── Raster values at points ──────────────────────────────────────────────────
-- The value of each raster at each point. A point with no real value there (no-data
-- pixel, or off the raster) has no row.
-- No foreign key to points, for the same reason as point_hazards.

CREATE TABLE IF NOT EXISTS point_raster_values (
    point_id  INTEGER          NOT NULL,
    raster_id TEXT             NOT NULL,
    value     DOUBLE PRECISION NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_point_raster_values_point ON point_raster_values (point_id, raster_id);
