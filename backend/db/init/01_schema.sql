-- Db schema, rebuild with (backend/scripts/rebuild.sh) after editing

CREATE TABLE IF NOT EXISTS datasets (
    id                 TEXT    PRIMARY KEY,
    label              TEXT    NOT NULL DEFAULT '',
    hawaiian_homelands BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS metrics (
    id                  SERIAL  PRIMARY KEY,
    dataset_id          TEXT    NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    name                TEXT    NOT NULL,
    classification_mode TEXT    NOT NULL DEFAULT 'q',
    mv_column           TEXT,
    display_order       INTEGER,
    has_moe             BOOLEAN NOT NULL DEFAULT FALSE,
    has_percentage      BOOLEAN NOT NULL DEFAULT FALSE,
    has_moe_pp          BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (dataset_id, name)
);

CREATE INDEX IF NOT EXISTS idx_metrics_dataset_display_order
    ON metrics (dataset_id, display_order);

CREATE TABLE IF NOT EXISTS geographies (
    geoid        TEXT PRIMARY KEY,
    type         TEXT NOT NULL,
    name         TEXT,
    block_group  TEXT,
    census_tract TEXT,
    county       TEXT,
    state        TEXT,
    population   INTEGER,
    geom         geometry(MultiPolygon, 4326)
);

CREATE INDEX IF NOT EXISTS idx_geographies_geom ON geographies USING GIST (geom);

CREATE TABLE IF NOT EXISTS metric_values (
    geoid                 TEXT    NOT NULL REFERENCES geographies(geoid) ON DELETE CASCADE,
    metric_id             INTEGER NOT NULL REFERENCES metrics(id)        ON DELETE CASCADE,
    absolute              NUMERIC,
    margin_of_error       NUMERIC,
    percentage            NUMERIC,
    moe_percentage_points NUMERIC,
    cv                    NUMERIC,
    moe_derived           BOOLEAN,
    PRIMARY KEY (geoid, metric_id)
);

-- Supports map coloring query: WHERE metric_id = $1
CREATE INDEX IF NOT EXISTS idx_metric_values_metric_id ON metric_values (metric_id);