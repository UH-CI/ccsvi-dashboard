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
        FILTER (WHERE m.dataset_id = 'age_of_structure' AND m.name = 'Total Housing Built Before 1990 (calc.)') AS age_of_structure__total_housing_built_before_1990_calc,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'age_of_structure' AND m.name = 'Total Housing Built Before 1970 (calc.)') AS age_of_structure__total_housing_built_before_1970_calc,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'population_group_quarters' AND m.name = 'Institutionalized population') AS population_group_quarters__institutionalized_population,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'population_group_quarters' AND m.name = 'Institutionalized population: Correctional facilities for adults') AS population_group_quarters__institutionalized_population__9fb436,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'population_group_quarters' AND m.name = 'Institutionalized population: Juvenile facilities') AS population_group_quarters__institutionalized_population__bffc6e,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'population_group_quarters' AND m.name = 'Institutionalized population: Nursing facilities/Skilled-nursing facilities') AS population_group_quarters__institutionalized_population__19f399,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'population_group_quarters' AND m.name = 'Institutionalized population: Other institutional facilities') AS population_group_quarters__institutionalized_population__adeffb,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'tenure' AND m.name = 'Renter occupied') AS tenure__renter_occupied,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'tenure_by_occupants_per_room' AND m.name = 'Total Overcrowded Housing Units (calc.)') AS tenure_by_occupants_per_room__total_overcrowded_housing__66b105,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'income_share_of_fpl' AND m.name = 'Total Under 100% FPL (calc.)') AS income_share_of_fpl__total_under_100_fpl_calc,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'income_share_of_fpl' AND m.name = 'Total Under 150% FPL (calc.)') AS income_share_of_fpl__total_under_150_fpl_calc,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'income_share_of_fpl' AND m.name = 'Total Under 200% FPL (calc.)') AS income_share_of_fpl__total_under_200_fpl_calc,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'health_insurance' AND m.name = 'No Health Insurance Coverage (calc.)') AS health_insurance__no_health_insurance_coverage_calc,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'person_under_5_65_males' AND m.name = 'Males Under 5 (calc.)') AS person_under_5_65_males__males_under_5_calc,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'person_under_5_65_females' AND m.name = 'Females Under 5 (calc.)') AS person_under_5_65_females__females_under_5_calc,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'person_under_5_65_males' AND m.name = 'Males Under 18 (calc.)') AS person_under_5_65_males__males_under_18_calc,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'person_under_5_65_females' AND m.name = 'Females Under 18 (calc.)') AS person_under_5_65_females__females_under_18_calc,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'person_under_5_65_males' AND m.name = 'Males Over 65 (calc.)') AS person_under_5_65_males__males_over_65_calc,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'person_under_5_65_females' AND m.name = 'Females Over 65 (calc.)') AS person_under_5_65_females__females_over_65_calc,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'person_under_5_65_total' AND m.name = 'Total Under 5 (calc.)') AS person_under_5_65_total__total_under_5_calc,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'person_under_5_65_total' AND m.name = 'Total Under 18 (calc.)') AS person_under_5_65_total__total_under_18_calc,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'person_under_5_65_total' AND m.name = 'Total Over 65 (calc.)') AS person_under_5_65_total__total_over_65_calc,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'living_arrangements' AND m.name = 'Total Living alone (calc.)') AS living_arrangements__total_living_alone_calc,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'family_type_by_children' AND m.name = 'Total Single-Parent Households With Children (calc.)') AS family_type_by_children__total_single_parent_households__5f36bd,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'race_origin' AND m.name = 'Native Hawaiian and Other Pacific Islander alone') AS race_origin__native_hawaiian_and_other_pacific_islander_alone,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'race_origin' AND m.name = 'Asian alone') AS race_origin__asian_alone,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'race_origin' AND m.name = 'Black or African American alone') AS race_origin__black_or_african_american_alone,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'race_origin' AND m.name = 'White alone') AS race_origin__white_alone,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'race_origin' AND m.name = 'Two or More Races') AS race_origin__two_or_more_races,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'limited_english_speaking' AND m.name = 'Total Limited English Speaking Households (calc.)') AS limited_english_speaking__total_limited_english_speaking_5ed13f,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'internet_subscription' AND m.name = 'No Internet access') AS internet_subscription__no_internet_access,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'households_w_computer' AND m.name = 'No Computer') AS households_w_computer__no_computer,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'aggregate_vehicles' AND m.name = 'Aggregate number of vehicles available') AS aggregate_vehicles__aggregate_number_of_vehicles_available,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'fire_stations_points' AND m.name = 'Count') AS fire_stations_points__count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'hospitals_points' AND m.name = 'Count') AS hospitals_points__count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'police_stations_points' AND m.name = 'Count') AS police_stations_points__count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'shelters_points' AND m.name = 'Count') AS shelters_points__count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'preschools_points' AND m.name = 'Count') AS preschools_points__count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'public_schools_points' AND m.name = 'Count') AS public_schools_points__count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'private_schools_points' AND m.name = 'Count') AS private_schools_points__count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'bridges_points' AND m.name = 'Count') AS bridges_points__count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'sewage_points' AND m.name = 'Count') AS sewage_points__count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'wastewater_plant_points' AND m.name = 'Count') AS wastewater_plant_points__count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'airports_points' AND m.name = 'Count') AS airports_points__count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'commercial_harbors_points' AND m.name = 'Count') AS commercial_harbors_points__count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'small_boat_harbors_points' AND m.name = 'Count') AS small_boat_harbors_points__count

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
        FILTER (WHERE m.dataset_id = '2022_census_hawaiian_homelands' AND m.name = 'POVERTY STATUS IN THE PAST 12 MONTHS Population for whom poverty status is determined Below 100 percent of the poverty level') AS d_2022_census_hawaiian_homelands__poverty_status_in_the__526cfd,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = '2022_census_hawaiian_homelands' AND m.name = 'Total Under 150% FPL (calc.)') AS d_2022_census_hawaiian_homelands__total_under_150_fpl_calc,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = '2022_census_hawaiian_homelands' AND m.name = 'Total Population Under 5 (calc.)') AS d_2022_census_hawaiian_homelands__total_population_under_5_calc,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = '2022_census_hawaiian_homelands' AND m.name = 'Total Population Under 18 (calc.)') AS d_2022_census_hawaiian_homelands__total_population_under_43d6ce,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = '2022_census_hawaiian_homelands' AND m.name = 'Total Population Over 65 (calc.)') AS d_2022_census_hawaiian_homelands__total_population_over_65_calc,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = '2022_census_hawaiian_homelands' AND m.name = 'LANGUAGE SPOKEN AT HOME AND ABILITY TO SPEAK ENGLISH Population 5 years and over Speak language other than English Speak English less than very well') AS d_2022_census_hawaiian_homelands__language_spoken_at_hom_ab95cf,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'fire_stations_points_homelands' AND m.name = 'Count') AS fire_stations_points_homelands__count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'hospitals_points_homelands' AND m.name = 'Count') AS hospitals_points_homelands__count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'police_stations_points_homelands' AND m.name = 'Count') AS police_stations_points_homelands__count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'shelters_points_homelands' AND m.name = 'Count') AS shelters_points_homelands__count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'preschools_points_homelands' AND m.name = 'Count') AS preschools_points_homelands__count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'public_schools_points_homelands' AND m.name = 'Count') AS public_schools_points_homelands__count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'private_schools_points_homelands' AND m.name = 'Count') AS private_schools_points_homelands__count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'bridges_points_homelands' AND m.name = 'Count') AS bridges_points_homelands__count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'sewage_points_homelands' AND m.name = 'Count') AS sewage_points_homelands__count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'wastewater_plant_points_homelands' AND m.name = 'Count') AS wastewater_plant_points_homelands__count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'airports_points_homelands' AND m.name = 'Count') AS airports_points_homelands__count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'commercial_harbors_points_homelands' AND m.name = 'Count') AS commercial_harbors_points_homelands__count,
    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)
        FILTER (WHERE m.dataset_id = 'small_boat_harbors_points_homelands' AND m.name = 'Count') AS small_boat_harbors_points_homelands__count

FROM geographies g
LEFT JOIN metric_values mv ON mv.geoid = g.geoid
LEFT JOIN metrics m ON m.id = mv.metric_id
WHERE g.type = 'hawaiian_homeland'
GROUP BY g.geoid, g.name, g.population, g.geom;

CREATE UNIQUE INDEX IF NOT EXISTS idx_hhlm_geoid ON hawaiian_homeland_metrics (geoid);
CREATE INDEX IF NOT EXISTS idx_hhlm_geom ON hawaiian_homeland_metrics USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_hhlm_centroid ON hawaiian_homeland_metrics USING GIST (centroid);
