CREATE SCHEMA IF NOT EXISTS vulnerability;

-- One table per vulnerability CSV.
-- geoid  = the "Geography" FIPS column from the CSV.
-- row_data = every other column stored as a JSONB blob.
CREATE TABLE IF NOT EXISTS vulnerability."2022_census_hawaiian_homelands" (
    geoid TEXT PRIMARY KEY,
    row_data JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS vulnerability.age_of_structure (
    geoid TEXT PRIMARY KEY,
    row_data JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS vulnerability.aggregate_vehicles (
    geoid TEXT PRIMARY KEY,
    row_data JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS vulnerability.genders (
    geoid TEXT PRIMARY KEY,
    row_data JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS vulnerability.health_insurance (
    geoid TEXT PRIMARY KEY,
    row_data JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS vulnerability.households_w_computer (
    geoid TEXT PRIMARY KEY,
    row_data JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS vulnerability.income_share_of_fpl (
    geoid TEXT PRIMARY KEY,
    row_data JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS vulnerability.internet_subscription (
    geoid TEXT PRIMARY KEY,
    row_data JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS vulnerability.limited_english_speaking (
    geoid TEXT PRIMARY KEY,
    row_data JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS vulnerability.living_arrangements (
    geoid TEXT PRIMARY KEY,
    row_data JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS vulnerability.person_under_5_65_females (
    geoid TEXT PRIMARY KEY,
    row_data JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS vulnerability.person_under_5_65_males (
    geoid TEXT PRIMARY KEY,
    row_data JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS vulnerability.population_group_quarters (
    geoid TEXT PRIMARY KEY,
    row_data JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS vulnerability.race_origin (
    geoid TEXT PRIMARY KEY,
    row_data JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS vulnerability.tenure (
    geoid TEXT PRIMARY KEY,
    row_data JSONB NOT NULL
);

-- Stores the content of census_metrics_by_block_group.json.
-- id      = the top-level JSON key (e.g. "5003").
-- metrics = the nested per-dataset metric data as a JSONB blob.
CREATE TABLE IF NOT EXISTS census_metrics (
    id           TEXT PRIMARY KEY,
    type         TEXT NOT NULL,
    name         TEXT,
    block_group  TEXT,
    census_tract TEXT,
    county       TEXT,
    state        TEXT,
    population   INTEGER,
    metrics      JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_census_metrics_type ON census_metrics (type);
