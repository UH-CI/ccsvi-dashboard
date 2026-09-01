-- GENERATED FILE — do not edit.
-- Change db/mv_columns.py, then run: python -m db.generate_views
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

    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'age_of_structure'
        AND m.name = 'Total Housing Built Before 1990 (calc.)') AS housing_pre_1990_pct_calc,
    MAX(mv.absolute) FILTER (WHERE m.dataset_id = 'aggregate_vehicles'
        AND m.name = 'Aggregate number of vehicles available') AS vehicles_aggregate_abs,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'genders'
        AND m.name = 'Male') AS gender_male_pct,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'genders'
        AND m.name = 'Female') AS gender_female_pct,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'health_insurance'
        AND m.name = 'No Health Insurance Coverage (calc.)') AS no_health_insurance_pct_calc,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'households_w_computer'
        AND m.name = 'No Computer') AS no_computer_pct,
    MAX(mv.absolute) FILTER (WHERE m.dataset_id = 'income_share_of_fpl'
        AND m.name = 'Total') AS fpl_total_abs,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'income_share_of_fpl'
        AND m.name = 'Total Under 100% FPL (calc.)') AS fpl_under_100_pct_calc,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'income_share_of_fpl'
        AND m.name = 'Total Under 150% FPL (calc.)') AS fpl_under_150_pct_calc,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'income_share_of_fpl'
        AND m.name = 'Total Under 200% FPL (calc.)') AS fpl_under_200_pct_calc,
    MAX(mv.absolute) FILTER (WHERE m.dataset_id = 'income_share_of_fpl'
        AND m.name = 'POVERTY STATUS IN THE PAST 12 MONTHS Population for whom poverty status is determined Below 100 percent of the poverty level') AS fpl_below_100_abs,
    MAX(mv.absolute) FILTER (WHERE m.dataset_id = 'income_share_of_fpl'
        AND m.name = 'POVERTY STATUS IN THE PAST 12 MONTHS Population for whom poverty status is determined 100 to 149 percent of the poverty level') AS fpl_100_to_149_abs,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'internet_subscription'
        AND m.name = 'No Internet access') AS no_internet_pct,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'limited_english_speaking'
        AND m.name = 'Total Limited English Speaking Households (calc.)') AS limited_english_total_pct_calc,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'limited_english_speaking'
        AND m.name = 'Spanish: Limited English speaking household') AS limited_english_spanish_pct,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'limited_english_speaking'
        AND m.name = 'Other Indo-European languages: Limited English speaking household') AS limited_english_indo_european_pct,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'limited_english_speaking'
        AND m.name = 'Asian and Pacific Island languages: Limited English speaking household') AS limited_english_asian_pi_pct,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'limited_english_speaking'
        AND m.name = 'Other languages: Limited English speaking household') AS limited_english_other_pct,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'living_arrangements'
        AND m.name = 'Total Living alone (calc.)') AS living_alone_total_pct_calc,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'living_arrangements'
        AND m.name = 'In households: Householder: Male: Living alone') AS living_alone_male_pct,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'living_arrangements'
        AND m.name = 'In households: Householder: Female: Living alone') AS living_alone_female_pct,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'person_under_5_65_females'
        AND m.name = 'Females Under 5 (calc.)') AS females_under_5_pct_calc,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'person_under_5_65_females'
        AND m.name = 'Females Under 18 (calc.)') AS females_under_18_pct_calc,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'person_under_5_65_females'
        AND m.name = 'Females Over 65 (calc.)') AS females_over_65_pct_calc,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'person_under_5_65_males'
        AND m.name = 'Males Under 5 (calc.)') AS males_under_5_pct_calc,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'person_under_5_65_males'
        AND m.name = 'Males Under 18 (calc.)') AS males_under_18_pct_calc,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'person_under_5_65_males'
        AND m.name = 'Males Over 65 (calc.)') AS males_over_65_pct_calc,
    MAX(mv.absolute) FILTER (WHERE m.dataset_id = 'population_group_quarters'
        AND m.name = 'Institutionalized population') AS group_quarters_total_abs,
    MAX(mv.absolute) FILTER (WHERE m.dataset_id = 'population_group_quarters'
        AND m.name = 'Institutionalized population: Correctional facilities for adults') AS group_quarters_correctional_abs,
    MAX(mv.absolute) FILTER (WHERE m.dataset_id = 'population_group_quarters'
        AND m.name = 'Institutionalized population: Juvenile facilities') AS group_quarters_juvenile_abs,
    MAX(mv.absolute) FILTER (WHERE m.dataset_id = 'population_group_quarters'
        AND m.name = 'Institutionalized population: Nursing facilities/Skilled-nursing facilities') AS group_quarters_nursing_abs,
    MAX(mv.absolute) FILTER (WHERE m.dataset_id = 'population_group_quarters'
        AND m.name = 'Institutionalized population: Other institutional facilities') AS group_quarters_other_abs,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'race_origin'
        AND m.name = 'White alone') AS race_white_pct,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'race_origin'
        AND m.name = 'Black or African American alone') AS race_black_pct,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'race_origin'
        AND m.name = 'American Indian and Alaska Native alone') AS race_aian_pct,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'race_origin'
        AND m.name = 'Asian alone') AS race_asian_pct,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'race_origin'
        AND m.name = 'Native Hawaiian and Other Pacific Islander alone') AS race_nhpi_pct,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'race_origin'
        AND m.name = 'Some Other Race alone') AS race_other_pct,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'race_origin'
        AND m.name = 'Two or More Races') AS race_two_or_more_pct,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = 'tenure'
        AND m.name = 'Renter occupied') AS tenure_renter_pct

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_bgm_geoid    ON block_group_metrics (geoid);
CREATE INDEX        IF NOT EXISTS idx_bgm_geom     ON block_group_metrics USING GIST (geom);
CREATE INDEX        IF NOT EXISTS idx_bgm_centroid ON block_group_metrics USING GIST (centroid);
CREATE INDEX        IF NOT EXISTS idx_bgm_county   ON block_group_metrics (county);


DROP MATERIALIZED VIEW IF EXISTS hawaiian_homeland_metrics;
CREATE MATERIALIZED VIEW hawaiian_homeland_metrics AS
SELECT
    g.geoid,
    g.name,
    g.population,
    g.geom,
    ST_Centroid(g.geom) AS centroid,

    MAX(mv.percentage) FILTER (WHERE m.dataset_id = '2022_census_hawaiian_homelands'
        AND m.name = 'Total Population Under 5 (calc.)') AS pop_under_5_pct_calc,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = '2022_census_hawaiian_homelands'
        AND m.name = 'Total Population Under 18 (calc.)') AS pop_under_18_pct_calc,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = '2022_census_hawaiian_homelands'
        AND m.name = 'Total Population Over 65 (calc.)') AS pop_over_65_pct_calc,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = '2022_census_hawaiian_homelands'
        AND m.name = 'Total population SEX Male') AS male_pct,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = '2022_census_hawaiian_homelands'
        AND m.name = 'Total population SEX Female') AS female_pct,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = '2022_census_hawaiian_homelands'
        AND m.name = 'Total population RACE AND HISPANIC OR LATINO ORIGIN One race White') AS race_white_pct,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = '2022_census_hawaiian_homelands'
        AND m.name = 'Total population RACE AND HISPANIC OR LATINO ORIGIN One race Black or African American') AS race_black_pct,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = '2022_census_hawaiian_homelands'
        AND m.name = 'Total population RACE AND HISPANIC OR LATINO ORIGIN One race American Indian and Alaska Native') AS race_aian_pct,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = '2022_census_hawaiian_homelands'
        AND m.name = 'Total population RACE AND HISPANIC OR LATINO ORIGIN One race Asian') AS race_asian_pct,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = '2022_census_hawaiian_homelands'
        AND m.name = 'Total population RACE AND HISPANIC OR LATINO ORIGIN One race Native Hawaiian and Other Pacific Islander') AS race_nhpi_pct,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = '2022_census_hawaiian_homelands'
        AND m.name = 'Total population RACE AND HISPANIC OR LATINO ORIGIN One race Some other race') AS race_other_pct,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = '2022_census_hawaiian_homelands'
        AND m.name = 'Total population RACE AND HISPANIC OR LATINO ORIGIN Two or more races') AS race_two_or_more_pct,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = '2022_census_hawaiian_homelands'
        AND m.name = 'Total population RACE AND HISPANIC OR LATINO ORIGIN Hispanic or Latino origin (of any race)') AS hispanic_pct,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = '2022_census_hawaiian_homelands'
        AND m.name = 'Total population RACE AND HISPANIC OR LATINO ORIGIN White alone, not Hispanic or Latino') AS race_white_non_hispanic_pct,
    MAX(mv.percentage) FILTER (WHERE m.dataset_id = '2022_census_hawaiian_homelands'
        AND m.name = 'LANGUAGE SPOKEN AT HOME AND ABILITY TO SPEAK ENGLISH Population 5 years and over Speak language other than English Speak English less than very well') AS limited_english_pct,
    MAX(mv.absolute) FILTER (WHERE m.dataset_id = '2022_census_hawaiian_homelands'
        AND m.name = 'INDIVIDUALS'' INCOME IN THE PAST 12 MONTHS (IN 2022 INFLATION-ADJUSTED DOLLARS) Population 15 years and over Median income (dollars)') AS median_income_abs

FROM geographies g
JOIN metric_values mv ON mv.geoid = g.geoid
JOIN metrics m ON m.id = mv.metric_id AND m.dataset_id = '2022_census_hawaiian_homelands'
GROUP BY g.geoid, g.name, g.population, g.geom;

CREATE UNIQUE INDEX IF NOT EXISTS idx_hhlm_geoid    ON hawaiian_homeland_metrics (geoid);
CREATE INDEX        IF NOT EXISTS idx_hhlm_geom     ON hawaiian_homeland_metrics USING GIST (geom);
CREATE INDEX        IF NOT EXISTS idx_hhlm_centroid ON hawaiian_homeland_metrics USING GIST (centroid);
