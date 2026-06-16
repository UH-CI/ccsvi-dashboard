-- Normalized schema replacing census_metrics + vulnerability.* tables.

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
    UNIQUE (dataset_id, name)
);

CREATE TABLE IF NOT EXISTS geographies (
    geoid        TEXT PRIMARY KEY,
    type         TEXT NOT NULL,
    name         TEXT,
    block_group  TEXT,
    census_tract TEXT,
    county       TEXT,
    state        TEXT,
    population   INTEGER
);

CREATE TABLE IF NOT EXISTS metric_values (
    geoid           TEXT    NOT NULL REFERENCES geographies(geoid) ON DELETE CASCADE,
    metric_id       INTEGER NOT NULL REFERENCES metrics(id)        ON DELETE CASCADE,
    absolute        NUMERIC,
    margin_of_error NUMERIC,
    percentage      NUMERIC,
    PRIMARY KEY (geoid, metric_id)
);

-- Supports map coloring query: WHERE metric_id = $1
CREATE INDEX IF NOT EXISTS idx_metric_values_metric_id ON metric_values (metric_id);