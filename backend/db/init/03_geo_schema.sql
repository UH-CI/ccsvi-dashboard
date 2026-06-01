-- Phase 3: geometry columns, spatial tables, and wide metric materialized views.
--
-- docker exec -i ccsvi-pg psql -U ccsvi -d ccsvi < backend/db/init/03_geo_schema.sql
--
-- After running load_postgis.py to populate geometry:
--   docker exec ccsvi-pg psql -U ccsvi -d ccsvi -c "REFRESH MATERIALIZED VIEW block_group_metrics;"
--   docker exec ccsvi-pg psql -U ccsvi -d ccsvi -c "REFRESH MATERIALIZED VIEW hawaiian_homeland_metrics;"


-- ── Geometry column on geographies ───────────────────────────────────────────
-- Populated by load_postgis.py (ogr2ogr from Census block group GeoJSON).
-- NULL for all rows until that ingestion runs.

ALTER TABLE geographies ADD COLUMN IF NOT EXISTS geom geometry(MultiPolygon, 4326);
CREATE INDEX IF NOT EXISTS idx_geographies_geom ON geographies USING GIST (geom);


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


-- ── block_group_metrics ───────────────────────────────────────────────────────
-- Wide materialized view: one row per Census block group geoid.
-- Each metric column stores the value most useful for cross-data filtering:
--   _pct      → metric_values.percentage
--   _abs      → metric_values.absolute
--   _pct_calc → percentage for a derived/calculated metric (no MoE in source data)
--
-- geom and centroid are NULL until load_postgis.py populates geographies.geom.
-- Run REFRESH MATERIALIZED VIEW after ingestion.

CREATE MATERIALIZED VIEW IF NOT EXISTS block_group_metrics AS
SELECT
    g.geoid,
    g.name,
    g.county,
    g.population,
    g.geom,
    ST_Centroid(g.geom) AS centroid,

    -- age_of_structure
    MAX(CASE WHEN m.dataset_id = 'age_of_structure'
             AND m.name = 'Total Housing Built Before 1990 (calc.)'
        THEN mv.percentage END)                                                         AS housing_pre_1990_pct_calc,

    -- aggregate_vehicles
    MAX(CASE WHEN m.dataset_id = 'aggregate_vehicles'
             AND m.name = 'Estimate Aggregate number of vehicles available'
        THEN mv.absolute END)                                                           AS vehicles_aggregate_abs,

    -- genders
    MAX(CASE WHEN m.dataset_id = 'genders' AND m.name = 'Male'
        THEN mv.percentage END)                                                         AS gender_male_pct,
    MAX(CASE WHEN m.dataset_id = 'genders' AND m.name = 'Female'
        THEN mv.percentage END)                                                         AS gender_female_pct,

    -- health_insurance
    MAX(CASE WHEN m.dataset_id = 'health_insurance'
             AND m.name = 'No Health Insurance Coverage (calc.)'
        THEN mv.percentage END)                                                         AS no_health_insurance_pct_calc,

    -- households_w_computer
    MAX(CASE WHEN m.dataset_id = 'households_w_computer' AND m.name = 'No Computer'
        THEN mv.percentage END)                                                         AS no_computer_pct,

    -- income_share_of_fpl
    MAX(CASE WHEN m.dataset_id = 'income_share_of_fpl'
             AND m.name = 'Estimate Total'
        THEN mv.absolute END)                                                           AS fpl_total_abs,
    MAX(CASE WHEN m.dataset_id = 'income_share_of_fpl'
             AND m.name = 'Total Under 100% FPL (calc.)'
        THEN mv.percentage END)                                                         AS fpl_under_100_pct_calc,
    MAX(CASE WHEN m.dataset_id = 'income_share_of_fpl'
             AND m.name = 'Total Under 150% FPL (calc.)'
        THEN mv.percentage END)                                                         AS fpl_under_150_pct_calc,
    MAX(CASE WHEN m.dataset_id = 'income_share_of_fpl'
             AND m.name = 'Total Under 200% FPL (calc.)'
        THEN mv.percentage END)                                                         AS fpl_under_200_pct_calc,
    MAX(CASE WHEN m.dataset_id = 'income_share_of_fpl'
             AND m.name = 'POVERTY STATUS IN THE PAST 12 MONTHS Population for whom poverty status is determined Below 100 percent of the poverty level'
        THEN mv.absolute END)                                                           AS fpl_below_100_abs,
    MAX(CASE WHEN m.dataset_id = 'income_share_of_fpl'
             AND m.name = 'POVERTY STATUS IN THE PAST 12 MONTHS Population for whom poverty status is determined 100 to 149 percent of the poverty level'
        THEN mv.absolute END)                                                           AS fpl_100_to_149_abs,

    -- internet_subscription
    MAX(CASE WHEN m.dataset_id = 'internet_subscription'
             AND m.name = 'No Internet access'
        THEN mv.percentage END)                                                         AS no_internet_pct,

    -- limited_english_speaking
    MAX(CASE WHEN m.dataset_id = 'limited_english_speaking'
             AND m.name = 'Total Limited English Speaking Households (calc.)'
        THEN mv.percentage END)                                                         AS limited_english_total_pct_calc,
    MAX(CASE WHEN m.dataset_id = 'limited_english_speaking'
             AND m.name = 'Spanish: Limited English speaking household'
        THEN mv.percentage END)                                                         AS limited_english_spanish_pct,
    MAX(CASE WHEN m.dataset_id = 'limited_english_speaking'
             AND m.name = 'Other Indo-European languages: Limited English speaking household'
        THEN mv.percentage END)                                                         AS limited_english_indo_european_pct,
    MAX(CASE WHEN m.dataset_id = 'limited_english_speaking'
             AND m.name = 'Asian and Pacific Island languages: Limited English speaking household'
        THEN mv.percentage END)                                                         AS limited_english_asian_pi_pct,
    MAX(CASE WHEN m.dataset_id = 'limited_english_speaking'
             AND m.name = 'Other languages: Limited English speaking household'
        THEN mv.percentage END)                                                         AS limited_english_other_pct,

    -- living_arrangements
    MAX(CASE WHEN m.dataset_id = 'living_arrangements'
             AND m.name = 'Total Living alone (calc.)'
        THEN mv.percentage END)                                                         AS living_alone_total_pct_calc,
    MAX(CASE WHEN m.dataset_id = 'living_arrangements'
             AND m.name = 'In households: Householder: Male: Living alone'
        THEN mv.percentage END)                                                         AS living_alone_male_pct,
    MAX(CASE WHEN m.dataset_id = 'living_arrangements'
             AND m.name = 'In households: Householder: Female: Living alone'
        THEN mv.percentage END)                                                         AS living_alone_female_pct,

    -- person_under_5_65_females
    MAX(CASE WHEN m.dataset_id = 'person_under_5_65_females'
             AND m.name = 'Females Under 5 (calc.)'
        THEN mv.percentage END)                                                         AS females_under_5_pct_calc,
    MAX(CASE WHEN m.dataset_id = 'person_under_5_65_females'
             AND m.name = 'Females Under 18 (calc.)'
        THEN mv.percentage END)                                                         AS females_under_18_pct_calc,
    MAX(CASE WHEN m.dataset_id = 'person_under_5_65_females'
             AND m.name = 'Females Over 65 (calc.)'
        THEN mv.percentage END)                                                         AS females_over_65_pct_calc,

    -- person_under_5_65_males
    MAX(CASE WHEN m.dataset_id = 'person_under_5_65_males'
             AND m.name = 'Males Under 5 (calc.)'
        THEN mv.percentage END)                                                         AS males_under_5_pct_calc,
    MAX(CASE WHEN m.dataset_id = 'person_under_5_65_males'
             AND m.name = 'Males Under 18 (calc.)'
        THEN mv.percentage END)                                                         AS males_under_18_pct_calc,
    MAX(CASE WHEN m.dataset_id = 'person_under_5_65_males'
             AND m.name = 'Males Over 65 (calc.)'
        THEN mv.percentage END)                                                         AS males_over_65_pct_calc,

    -- population_group_quarters
    MAX(CASE WHEN m.dataset_id = 'population_group_quarters'
             AND m.name = 'Institutionalized population'
        THEN mv.absolute END)                                                           AS group_quarters_total_abs,
    MAX(CASE WHEN m.dataset_id = 'population_group_quarters'
             AND m.name = 'Institutionalized population: Correctional facilities for adults'
        THEN mv.absolute END)                                                           AS group_quarters_correctional_abs,
    MAX(CASE WHEN m.dataset_id = 'population_group_quarters'
             AND m.name = 'Institutionalized population: Juvenile facilities'
        THEN mv.absolute END)                                                           AS group_quarters_juvenile_abs,
    MAX(CASE WHEN m.dataset_id = 'population_group_quarters'
             AND m.name = 'Institutionalized population: Nursing facilities/Skilled-nursing facilities'
        THEN mv.absolute END)                                                           AS group_quarters_nursing_abs,
    MAX(CASE WHEN m.dataset_id = 'population_group_quarters'
             AND m.name = 'Institutionalized population: Other institutional facilities'
        THEN mv.absolute END)                                                           AS group_quarters_other_abs,

    -- race_origin
    MAX(CASE WHEN m.dataset_id = 'race_origin' AND m.name = 'White alone'
        THEN mv.percentage END)                                                         AS race_white_pct,
    MAX(CASE WHEN m.dataset_id = 'race_origin' AND m.name = 'Black or African American alone'
        THEN mv.percentage END)                                                         AS race_black_pct,
    MAX(CASE WHEN m.dataset_id = 'race_origin' AND m.name = 'American Indian and Alaska Native alone'
        THEN mv.percentage END)                                                         AS race_aian_pct,
    MAX(CASE WHEN m.dataset_id = 'race_origin' AND m.name = 'Asian alone'
        THEN mv.percentage END)                                                         AS race_asian_pct,
    MAX(CASE WHEN m.dataset_id = 'race_origin' AND m.name = 'Native Hawaiian and Other Pacific Islander alone'
        THEN mv.percentage END)                                                         AS race_nhpi_pct,
    MAX(CASE WHEN m.dataset_id = 'race_origin' AND m.name = 'Some Other Race alone'
        THEN mv.percentage END)                                                         AS race_other_pct,
    MAX(CASE WHEN m.dataset_id = 'race_origin' AND m.name = 'Two or More Races'
        THEN mv.percentage END)                                                         AS race_two_or_more_pct,

    -- tenure
    MAX(CASE WHEN m.dataset_id = 'tenure' AND m.name = 'Renter occupied'
        THEN mv.percentage END)                                                         AS tenure_renter_pct

FROM geographies g
LEFT JOIN metric_values mv ON mv.geoid = g.geoid
LEFT JOIN metrics m ON m.id = mv.metric_id
WHERE EXISTS (
    SELECT 1
    FROM metric_values mv2
    JOIN metrics m2 ON m2.id = mv2.metric_id
    WHERE mv2.geoid = g.geoid
      AND m2.dataset_id != '2022_census_hawaiian_homelands'
)
GROUP BY g.geoid, g.name, g.county, g.population, g.geom;

CREATE UNIQUE INDEX ON block_group_metrics (geoid);
CREATE INDEX ON block_group_metrics USING GIST (geom);
CREATE INDEX ON block_group_metrics USING GIST (centroid);
CREATE INDEX ON block_group_metrics (county);


-- ── hawaiian_homeland_metrics ─────────────────────────────────────────────────
-- Wide materialized view: one row per Hawaiian Homeland geoid.
-- Separate from block_group_metrics because HHL geoids are a distinct geographic
-- unit with a distinct metric set and different denominators.
-- geom populated by load_postgis.py from Census_Hawaiian_Homelands GeoJSON.

CREATE MATERIALIZED VIEW IF NOT EXISTS hawaiian_homeland_metrics AS
SELECT
    g.geoid,
    g.name,
    g.population,
    g.geom,
    ST_Centroid(g.geom) AS centroid,

    MAX(CASE WHEN m.name = 'Total Population Under 5 (calc.)'
        THEN mv.percentage END)                                                         AS pop_under_5_pct_calc,
    MAX(CASE WHEN m.name = 'Total Population Under 18 (calc.)'
        THEN mv.percentage END)                                                         AS pop_under_18_pct_calc,
    MAX(CASE WHEN m.name = 'Total Population Over 65 (calc.)'
        THEN mv.percentage END)                                                         AS pop_over_65_pct_calc,
    MAX(CASE WHEN m.name = 'Total population SEX Male'
        THEN mv.percentage END)                                                         AS male_pct,
    MAX(CASE WHEN m.name = 'Total population SEX Female'
        THEN mv.percentage END)                                                         AS female_pct,
    MAX(CASE WHEN m.name = 'Total population RACE AND HISPANIC OR LATINO ORIGIN One race White'
        THEN mv.percentage END)                                                         AS race_white_pct,
    MAX(CASE WHEN m.name = 'Total population RACE AND HISPANIC OR LATINO ORIGIN One race Black or African American'
        THEN mv.percentage END)                                                         AS race_black_pct,
    MAX(CASE WHEN m.name = 'Total population RACE AND HISPANIC OR LATINO ORIGIN One race American Indian and Alaska Native'
        THEN mv.percentage END)                                                         AS race_aian_pct,
    MAX(CASE WHEN m.name = 'Total population RACE AND HISPANIC OR LATINO ORIGIN One race Asian'
        THEN mv.percentage END)                                                         AS race_asian_pct,
    MAX(CASE WHEN m.name = 'Total population RACE AND HISPANIC OR LATINO ORIGIN One race Native Hawaiian and Other Pacific Islander'
        THEN mv.percentage END)                                                         AS race_nhpi_pct,
    MAX(CASE WHEN m.name = 'Total population RACE AND HISPANIC OR LATINO ORIGIN One race Some other race'
        THEN mv.percentage END)                                                         AS race_other_pct,
    MAX(CASE WHEN m.name = 'Total population RACE AND HISPANIC OR LATINO ORIGIN Two or more races'
        THEN mv.percentage END)                                                         AS race_two_or_more_pct,
    MAX(CASE WHEN m.name = 'Total population RACE AND HISPANIC OR LATINO ORIGIN Hispanic or Latino origin (of any race)'
        THEN mv.percentage END)                                                         AS hispanic_pct,
    MAX(CASE WHEN m.name = 'Total population RACE AND HISPANIC OR LATINO ORIGIN White alone, not Hispanic or Latino'
        THEN mv.percentage END)                                                         AS race_white_non_hispanic_pct,
    MAX(CASE WHEN m.name = 'LANGUAGE SPOKEN AT HOME AND ABILITY TO SPEAK ENGLISH Population 5 years and over Speak language other than English Speak English less than very well'
        THEN mv.percentage END)                                                         AS limited_english_pct,
    MAX(CASE WHEN m.name = 'INDIVIDUALS'' INCOME IN THE PAST 12 MONTHS (IN 2022 INFLATION-ADJUSTED DOLLARS) Population 15 years and over Median income (dollars)'
        THEN mv.absolute END)                                                           AS median_income_abs

FROM geographies g
JOIN metric_values mv ON mv.geoid = g.geoid
JOIN metrics m ON m.id = mv.metric_id AND m.dataset_id = '2022_census_hawaiian_homelands'
GROUP BY g.geoid, g.name, g.population, g.geom;

CREATE UNIQUE INDEX ON hawaiian_homeland_metrics (geoid);
CREATE INDEX ON hawaiian_homeland_metrics USING GIST (geom);
CREATE INDEX ON hawaiian_homeland_metrics USING GIST (centroid);