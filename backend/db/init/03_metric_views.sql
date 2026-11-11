-- GENERATED FILE — do not edit.
-- Change config/census_menu.json or the point layers, then run: python -m db.generate_views
--
-- Both views are dropped and recreated on every apply
-- A rebuild applies this while the tables are still empty, so refresh afterwards:
--   docker exec ccsvi-pg psql -U ccsvi -d ccsvi -c "REFRESH MATERIALIZED VIEW block_group_metrics;"
--   docker exec ccsvi-pg psql -U ccsvi -d ccsvi -c "REFRESH MATERIALIZED VIEW hawaiian_homeland_metrics;"


DROP MATERIALIZED VIEW IF EXISTS block_group_metrics;
CREATE MATERIALIZED VIEW block_group_metrics AS
SELECT
    g.geoid,
    g.name,
    g.county,
    g.population,
    g.geom,
    ST_Centroid(g.geom) AS centroid,

    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'housing_before_1990') AS housing_before_1990,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'housing_before_1970') AS housing_before_1970,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'group_quarters') AS group_quarters,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'group_quarters_correctional') AS group_quarters_correctional,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'group_quarters_juvenile') AS group_quarters_juvenile,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'group_quarters_nursing') AS group_quarters_nursing,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'group_quarters_other') AS group_quarters_other,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'renter_occupied') AS renter_occupied,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'overcrowded_housing') AS overcrowded_housing,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'below_100_fpl') AS below_100_fpl,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'below_150_fpl') AS below_150_fpl,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'below_200_fpl') AS below_200_fpl,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'no_health_insurance') AS no_health_insurance,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'under_5_male') AS under_5_male,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'under_5_female') AS under_5_female,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'under_18_male') AS under_18_male,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'under_18_female') AS under_18_female,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'over_65_male') AS over_65_male,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'over_65_female') AS over_65_female,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'under_5') AS under_5,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'under_18') AS under_18,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'over_65') AS over_65,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'living_alone') AS living_alone,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'single_parent_households') AS single_parent_households,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'native_hawaiian_pacific_islander') AS native_hawaiian_pacific_islander,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'asian') AS asian,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'black_african_american') AS black_african_american,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'white') AS white,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'two_or_more_races') AS two_or_more_races,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'limited_english') AS limited_english,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'no_internet') AS no_internet,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'no_computer') AS no_computer,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'no_vehicle') AS no_vehicle,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'fire_stations_count') AS fire_stations_count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'hospitals_count') AS hospitals_count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'police_stations_count') AS police_stations_count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'shelters_count') AS shelters_count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'preschools_count') AS preschools_count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'public_schools_count') AS public_schools_count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'private_schools_count') AS private_schools_count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'bridges_count') AS bridges_count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'sewage_count') AS sewage_count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'wastewater_plant_count') AS wastewater_plant_count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'airports_count') AS airports_count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'commercial_harbors_count') AS commercial_harbors_count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'small_boat_harbors_count') AS small_boat_harbors_count

FROM geographies g
LEFT JOIN metric_values mv ON mv.geoid = g.geoid
LEFT JOIN metrics m ON m.id = mv.metric_id
WHERE g.type = 'block_group'
GROUP BY g.geoid, g.name, g.county, g.population, g.geom;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bgm_geoid ON block_group_metrics (geoid);
CREATE INDEX IF NOT EXISTS idx_bgm_geom ON block_group_metrics USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_bgm_centroid ON block_group_metrics USING GIST (centroid);
CREATE INDEX IF NOT EXISTS idx_bgm_county ON block_group_metrics (county);


DROP MATERIALIZED VIEW IF EXISTS hawaiian_homeland_metrics;
CREATE MATERIALIZED VIEW hawaiian_homeland_metrics AS
SELECT
    g.geoid,
    g.name,
    g.population,
    g.geom,
    ST_Centroid(g.geom) AS centroid,

    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'below_100_fpl_homelands') AS below_100_fpl_homelands,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'below_150_fpl_homelands') AS below_150_fpl_homelands,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'under_5_homelands') AS under_5_homelands,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'under_18_homelands') AS under_18_homelands,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'over_65_homelands') AS over_65_homelands,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'limited_english_homelands') AS limited_english_homelands,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'fire_stations_count_homelands') AS fire_stations_count_homelands,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'hospitals_count_homelands') AS hospitals_count_homelands,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'police_stations_count_homelands') AS police_stations_count_homelands,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'shelters_count_homelands') AS shelters_count_homelands,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'preschools_count_homelands') AS preschools_count_homelands,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'public_schools_count_homelands') AS public_schools_count_homelands,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'private_schools_count_homelands') AS private_schools_count_homelands,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'bridges_count_homelands') AS bridges_count_homelands,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'sewage_count_homelands') AS sewage_count_homelands,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'wastewater_plant_count_homelands') AS wastewater_plant_count_homelands,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'airports_count_homelands') AS airports_count_homelands,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'commercial_harbors_count_homelands') AS commercial_harbors_count_homelands,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.key = 'small_boat_harbors_count_homelands') AS small_boat_harbors_count_homelands

FROM geographies g
LEFT JOIN metric_values mv ON mv.geoid = g.geoid
LEFT JOIN metrics m ON m.id = mv.metric_id
WHERE g.type = 'hawaiian_homeland'
GROUP BY g.geoid, g.name, g.population, g.geom;

CREATE UNIQUE INDEX IF NOT EXISTS idx_hhlm_geoid ON hawaiian_homeland_metrics (geoid);
CREATE INDEX IF NOT EXISTS idx_hhlm_geom ON hawaiian_homeland_metrics USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_hhlm_centroid ON hawaiian_homeland_metrics USING GIST (centroid);
