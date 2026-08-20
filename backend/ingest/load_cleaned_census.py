"""Reads every cleaned census CSV in a dir and inserts into datasets/metrics/metric_values.
Geographies table are assumed to already exist.

Usage (from the backend/ directory, after activating .venv and exporting DATABASE_URL):
    python -m ingest.load_cleaned_census

Cleans raw Census files and loads the result into database
Pass --dir instead to skip cleaning and load CSVs you already have. 
"""

import argparse
import asyncio
import glob
import os
import tempfile

import asyncpg
import pandas as pd

from cleaning import pipeline, proportions
from cleaning.census_transform import clean_column_name

REPO_ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
DEFAULT_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "cleaning", "config", "census_datasets_config.json")

# Where the raw-cleaning pipeline reads its inputs from on the VM. Edit if
# VM's directory layout changes.
DEFAULT_RAW_BASE_PATH = "/home/exouser/ccsvi-data/archived/raw_files/census_raw"
DEFAULT_CENTRAL_DIR = "/home/exouser/ccsvi-data/archived/raw_files/census_raw"
DEFAULT_NOTES_XLSX = "/home/exouser/ccsvi-data/archived/raw_files/metrics/JPL_CCSVI_all_fields.xlsx"
DEFAULT_BOUNDARIES_GEOJSON = os.path.join(REPO_ROOT, "public", "data", "2020_Census_Block_Groups_Stripped.geojson")
DEFAULT_HAWAIIAN_HOMELANDS_GEOJSON = os.path.join(
    REPO_ROOT, "public", "data", "Census_Hawaiian_Homelands_hhl10_Stripped.geojson"
)
DEFAULT_OUTPUT_DIR = "/home/exouser/ccsvi-data/archived/cleaned-data"

PREFIXES_TO_REMOVE = ["Estimate!!Total:!!", "Estimate!!Total!!", "Margin of Error!!", "Estimate!!"]

NON_METRIC_COLS = {"Geography", "Geographic Area Name", "Census_Population"}

# dataset id -> (display label, is Hawaiian Homelands)
DATASET_LABELS = {
    "age_of_structure": ("Housing units by year structure was built", False),
    "aggregate_vehicles": ("Aggregate number of vehicles available by tenure", False),
    "genders": ("Population by sex", False),
    "health_insurance": ("Health insurance coverage status by age", False),
    "households_w_computer": ("Households with computer and internet access", False),
    "income_share_of_fpl": ("Ratio of income to poverty level", False),
    "internet_subscription": ("Types of internet subscriptions in household", False),
    "limited_english_speaking": ("Households with limited English speaking ability", False),
    "living_arrangements": ("Living arrangements including living alone by sex and relationship", False),
    "person_under_5_65_males": ("Male population by age group (under 5, under 18, over 65)", False),
    "person_under_5_65_females": ("Female population by age group (under 5, under 18, over 65)", False),
    "population_group_quarters": ("Population in group quarters", False),
    "race_origin": ("Race and Hispanic or Latino origin", False),
    "tenure": ("Tenure (owner vs. renter occupied housing)", False),
    "2022_census_hawaiian_homelands": (
        "Selected characteristics of the total and Native Hawaiian population in Hawaiian Homelands",
        True,
    ),
}

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://localhost/ccsvi")

# Turns a raw Census column header into a short metric name
def metric_name_for(col: str) -> str:
    name = clean_column_name(col, PREFIXES_TO_REMOVE)
    return name if name else "Total"

# Finds the matching Margin of Error column for an Estimate column, if any.
# Calculated (non-Census) columns never have one.
def moe_column_for(col: str) -> str | None:
    if not col.startswith("Estimate!!"):
        return None
    return "Margin of Error!!" + col[len("Estimate!!"):]

# person_under_5_65's total population column is duplicated into all three of its output files, so it's only kept as a metric under "genders"
DUPLICATE_METRIC_COLUMNS = {
    "person_under_5_65_males": "Estimate!!Total:",
    "person_under_5_65_females": "Estimate!!Total:",
}

def read_dataset_rows(csv_path: str, skip_column: str | None = None) -> tuple[list[str], list[tuple[str, dict]]]:
    df = pd.read_csv(csv_path, na_values=["", "-", "**", "null"])

    base_cols = [
        col
        for col in df.columns
        if col not in NON_METRIC_COLS
        and col != skip_column
        and not col.startswith("Margin of Error")
        and not col.endswith(" (%)")
    ]
    col_to_metric = {col: metric_name_for(col) for col in base_cols}
    metric_names = list(col_to_metric.values())

    rows = []
    for _, row in df.iterrows():
        geoid = row["Geography"]
        if pd.isna(geoid):
            continue
        # The raw file's "Geography" column holds the Census Bureau's long ID, e.g.
        # "1500000US150010201001" or "2500000US5048" — the geographies table stores
        # just the part after "US" ("150010201001" / "5048"), so strip it to match.
        geoid = str(geoid).split("US")[-1]

        values = {}
        for col in base_cols:
            moe_col = moe_column_for(col)
            pct_col = f"{col} (%)"
            values[col_to_metric[col]] = {
                "absolute": None if pd.isna(row[col]) else float(row[col]),
                "margin_of_error": (
                    None
                    if moe_col is None or moe_col not in df.columns or pd.isna(row[moe_col])
                    else float(row[moe_col])
                ),
                "percentage": (
                    None if pct_col not in df.columns or pd.isna(row[pct_col]) else float(row[pct_col])
                ),
            }
        rows.append((str(geoid), values))

    return metric_names, rows


async def load_dataset(conn: asyncpg.Connection, dataset_id: str, csv_path: str) -> None:
    label, hawaiian_homelands = DATASET_LABELS[dataset_id]

    await conn.execute(
        """
        INSERT INTO datasets (id, label, hawaiian_homelands)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE SET
            label              = EXCLUDED.label,
            hawaiian_homelands = EXCLUDED.hawaiian_homelands
        """,
        dataset_id,
        label,
        hawaiian_homelands,
    )

    metric_names, rows = read_dataset_rows(csv_path, skip_column=DUPLICATE_METRIC_COLUMNS.get(dataset_id))

    # Drop any metric this dataset no longer produces so stale values don't hang
    await conn.execute(
        "DELETE FROM metrics WHERE dataset_id = $1 AND name != ALL($2::text[])",
        dataset_id,
        list(dict.fromkeys(metric_names)),
    )

    await conn.executemany(
        """
        INSERT INTO metrics (dataset_id, name, classification_mode)
        VALUES ($1, $2, 'q')
        ON CONFLICT (dataset_id, name) DO NOTHING
        """,
        [(dataset_id, name) for name in dict.fromkeys(metric_names)],
    )

    metric_id_map = {
        r["name"]: r["id"]
        for r in await conn.fetch("SELECT id, name FROM metrics WHERE dataset_id = $1", dataset_id)
    }

    value_rows = [
        (geoid, metric_id_map[name], v["absolute"], v["margin_of_error"], v["percentage"])
        for geoid, values in rows
        for name, v in values.items()
    ]

    chunk_size = 5000
    for i in range(0, len(value_rows), chunk_size):
        await conn.executemany(
            """
            INSERT INTO metric_values (geoid, metric_id, absolute, margin_of_error, percentage)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (geoid, metric_id) DO UPDATE SET
                absolute        = EXCLUDED.absolute,
                margin_of_error = EXCLUDED.margin_of_error,
                percentage      = EXCLUDED.percentage
            """,
            value_rows[i : i + chunk_size],
        )

    print(f"  {dataset_id}: {len(metric_names)} metrics, {len(value_rows)} metric_values rows")


# If --dir given, skip cleaning and use that folder. Else, run the full
# raw-to-cleaned pipeline and return the folder its output landed in.
def resolve_cleaned_dir(args: argparse.Namespace) -> str:
    if args.dir:
        return args.dir

    cleaned_dir = args.output_dir or tempfile.mkdtemp(prefix="ccsvi-cleaned-")

    print(f"Cleaning raw datasets into {cleaned_dir} ...")
    pipeline.run_full_cleaning(
        args.config,
        args.raw_base_path,
        args.notes_xlsx,
        args.central_dir,
        output_dir=cleaned_dir,
    )

    block_group_populations = proportions.load_block_group_populations(args.boundaries_geojson)
    hawaiian_homelands_populations = proportions.load_hawaiian_homelands_populations(
        args.hawaiian_homelands_geojson
    )
    pipeline.add_percentages_to_directory(
        cleaned_dir,
        args.config,
        args.raw_base_path,
        block_group_populations,
        hawaiian_homelands_populations,
    )

    return cleaned_dir


async def main(cleaned_dir: str) -> None:
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        csv_files = sorted(glob.glob(os.path.join(cleaned_dir, "*.csv")))
        print(f"Found {len(csv_files)} CSV file(s) in {cleaned_dir}")

        for csv_path in csv_files:
            dataset_id = os.path.splitext(os.path.basename(csv_path))[0]
            if dataset_id not in DATASET_LABELS:
                print(f"  ⚠ Skipping {os.path.basename(csv_path)} — no entry in DATASET_LABELS")
                continue
            await load_dataset(conn, dataset_id, csv_path)

        print("Done.")
    finally:
        await conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--dir", help="Skip cleaning — load a folder of already-cleaned census CSVs instead"
    )
    parser.add_argument("--raw-base-path", default=DEFAULT_RAW_BASE_PATH)
    parser.add_argument("--config", default=DEFAULT_CONFIG_PATH)
    parser.add_argument("--notes-xlsx", default=DEFAULT_NOTES_XLSX)
    parser.add_argument("--central-dir", default=DEFAULT_CENTRAL_DIR)
    parser.add_argument("--boundaries-geojson", default=DEFAULT_BOUNDARIES_GEOJSON)
    parser.add_argument("--hawaiian-homelands-geojson", default=DEFAULT_HAWAIIAN_HOMELANDS_GEOJSON)
    parser.add_argument("--output-dir", default=DEFAULT_OUTPUT_DIR)
    args = parser.parse_args()

    asyncio.run(main(resolve_cleaned_dir(args)))
