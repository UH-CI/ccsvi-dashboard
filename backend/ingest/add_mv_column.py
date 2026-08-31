#!/usr/bin/env python3
"""Fills in metrics.mv_column so the API can tell the frontend which
block_group_metrics column each metric corresponds to (needed for the
cross-dataset filter UI's threshold dropdown). Safe to run more than once.

Usage (from the backend/ directory):
    DATABASE_URL=postgresql://ccsvi:<pass>@localhost/ccsvi python3 -m ingest.add_mv_column
"""

import asyncio
import os

import asyncpg

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://localhost/ccsvi")

# (mv_column, dataset_id, metric name) — transcribed from the CASE expressions
# in backend/db/init/02_geo_schema.sql (block_group_metrics MV). Cross-checked
# against ALLOWED_METRIC_COLS / _BGM_METRIC_COLS in backend/app/routers/block_groups.py.
MAPPINGS: list[tuple[str, str, str]] = [
    ("housing_pre_1990_pct_calc", "age_of_structure", "Total Housing Built Before 1990 (calc.)"),
    ("vehicles_aggregate_abs", "aggregate_vehicles", "Estimate Aggregate number of vehicles available"),
    ("gender_male_pct", "genders", "Male"),
    ("gender_female_pct", "genders", "Female"),
    ("no_health_insurance_pct_calc", "health_insurance", "No Health Insurance Coverage (calc.)"),
    ("no_computer_pct", "households_w_computer", "No Computer"),
    ("fpl_total_abs", "income_share_of_fpl", "Estimate Total"),
    ("fpl_under_100_pct_calc", "income_share_of_fpl", "Total Under 100% FPL (calc.)"),
    ("fpl_under_150_pct_calc", "income_share_of_fpl", "Total Under 150% FPL (calc.)"),
    ("fpl_under_200_pct_calc", "income_share_of_fpl", "Total Under 200% FPL (calc.)"),
    (
        "fpl_below_100_abs",
        "income_share_of_fpl",
        "POVERTY STATUS IN THE PAST 12 MONTHS Population for whom poverty status is "
        "determined Below 100 percent of the poverty level",
    ),
    (
        "fpl_100_to_149_abs",
        "income_share_of_fpl",
        "POVERTY STATUS IN THE PAST 12 MONTHS Population for whom poverty status is "
        "determined 100 to 149 percent of the poverty level",
    ),
    ("no_internet_pct", "internet_subscription", "No Internet access"),
    ("limited_english_total_pct_calc", "limited_english_speaking", "Total Limited English Speaking Households (calc.)"),
    ("limited_english_spanish_pct", "limited_english_speaking", "Spanish: Limited English speaking household"),
    (
        "limited_english_indo_european_pct",
        "limited_english_speaking",
        "Other Indo-European languages: Limited English speaking household",
    ),
    (
        "limited_english_asian_pi_pct",
        "limited_english_speaking",
        "Asian and Pacific Island languages: Limited English speaking household",
    ),
    ("limited_english_other_pct", "limited_english_speaking", "Other languages: Limited English speaking household"),
    ("living_alone_total_pct_calc", "living_arrangements", "Total Living alone (calc.)"),
    ("living_alone_male_pct", "living_arrangements", "In households: Householder: Male: Living alone"),
    ("living_alone_female_pct", "living_arrangements", "In households: Householder: Female: Living alone"),
    ("females_under_5_pct_calc", "person_under_5_65_females", "Females Under 5 (calc.)"),
    ("females_under_18_pct_calc", "person_under_5_65_females", "Females Under 18 (calc.)"),
    ("females_over_65_pct_calc", "person_under_5_65_females", "Females Over 65 (calc.)"),
    ("males_under_5_pct_calc", "person_under_5_65_males", "Males Under 5 (calc.)"),
    ("males_under_18_pct_calc", "person_under_5_65_males", "Males Under 18 (calc.)"),
    ("males_over_65_pct_calc", "person_under_5_65_males", "Males Over 65 (calc.)"),
    ("group_quarters_total_abs", "population_group_quarters", "Institutionalized population"),
    (
        "group_quarters_correctional_abs",
        "population_group_quarters",
        "Institutionalized population: Correctional facilities for adults",
    ),
    ("group_quarters_juvenile_abs", "population_group_quarters", "Institutionalized population: Juvenile facilities"),
    (
        "group_quarters_nursing_abs",
        "population_group_quarters",
        "Institutionalized population: Nursing facilities/Skilled-nursing facilities",
    ),
    (
        "group_quarters_other_abs",
        "population_group_quarters",
        "Institutionalized population: Other institutional facilities",
    ),
    ("race_white_pct", "race_origin", "White alone"),
    ("race_black_pct", "race_origin", "Black or African American alone"),
    ("race_aian_pct", "race_origin", "American Indian and Alaska Native alone"),
    ("race_asian_pct", "race_origin", "Asian alone"),
    ("race_nhpi_pct", "race_origin", "Native Hawaiian and Other Pacific Islander alone"),
    ("race_other_pct", "race_origin", "Some Other Race alone"),
    ("race_two_or_more_pct", "race_origin", "Two or More Races"),
    ("tenure_renter_pct", "tenure", "Renter occupied"),
]


async def migrate() -> None:
    conn = await asyncpg.connect(DATABASE_URL)

    try:
        await conn.execute("ALTER TABLE metrics ADD COLUMN IF NOT EXISTS mv_column TEXT;")
        print("Ensured metrics.mv_column exists.")

        for mv_column, dataset_id, name in MAPPINGS:
            result = await conn.execute(
                "UPDATE metrics SET mv_column = $1 WHERE dataset_id = $2 AND name = $3",
                mv_column,
                dataset_id,
                name,
            )
            if result == "UPDATE 0":
                print(f"  WARNING: no match for dataset_id={dataset_id!r} name={name!r}")

        mapped_count = await conn.fetchval("SELECT count(*) FROM metrics WHERE mv_column IS NOT NULL")
        print(f"\nVerification: {mapped_count} metrics have mv_column set (expected {len(MAPPINGS)}).")

        expected_cols = {m[0] for m in MAPPINGS}
        actual_cols = {
            r["mv_column"]
            for r in await conn.fetch("SELECT DISTINCT mv_column FROM metrics WHERE mv_column IS NOT NULL")
        }
        missing = expected_cols - actual_cols
        if missing:
            print(f"  MISSING mv_column values (no metrics row matched): {sorted(missing)}")
        else:
            print("  All expected mv_column values present.")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(migrate())