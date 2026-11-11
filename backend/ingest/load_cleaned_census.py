"""Reads every cleaned census CSV in a dir and inserts into datasets/metrics/metric_values.
Geographies table are assumed to already exist.

rebuild.sh runs it. By hand, from the backend/ directory with .venv active and DATABASE_URL set:
    python -m ingest.load_cleaned_census

Cleans raw Census files and loads the result into database
Pass --dir instead to skip cleaning and load CSVs you already have, or --clean-only to clean and stop.
Each census menu indicator's metric gets the indicator's key; the run stops if one matches no metric.
"""

import argparse
import asyncio
import os
import tempfile

import asyncpg
import pandas as pd

import settings
from ingest.writer import Dataset, Metric, Value, save_dataset
from pipeline.census import clean, proportions
from pipeline.census.census_transform import metric_columns
from pipeline.census.csv_format import CV, MISSING_VALUES, MOE_DERIVED, MOE_PP, PERCENT, moe_column_name
from registry import census_indicators

REPO_ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
DEFAULT_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "pipeline", "census", "config", "census_datasets_config.json")
DEFAULT_BOUNDARIES_GEOJSON = os.path.join(REPO_ROOT, "public", "data", "2020_Census_Block_Groups_Stripped.geojson")


# True when the CSV has this column and at least one row has a value in it
def _column_has_values(df: pd.DataFrame, col: str) -> bool:
    return col in df.columns and bool(df[col].notna().any())


# Builds one geographies row from a cleaned CSV row, in table column order. ACS files
# separate the name parts with ";", the Decennial file (group quarters) with ","
def geography_row(geoid: str, name, population, is_homeland: bool) -> tuple:
    pop = None if pd.isna(population) else int(float(population))
    name = None if pd.isna(name) else str(name)

    if is_homeland:
        return (geoid, "hawaiian_homeland", name, None, None, None, None, pop)

    parts = [p.strip() for p in name.replace(";", ",").split(",")]
    return (geoid, "block_group", name, parts[0], parts[1], parts[2], parts[3], pop)


# keys gives the metric names that are menu indicators their keys
def read_dataset_rows(
    csv_path: str, skip_column: str | None, keys: dict[str, str]
) -> tuple[list[Metric], list[Value], list[tuple]]:
    df = pd.read_csv(csv_path, na_values=MISSING_VALUES)

    col_to_metric = metric_columns(df.columns, skip_column, os.path.basename(csv_path))
    base_cols = list(col_to_metric)

    # One metric per column: its position, and which derived values it has
    metrics = [
        Metric(
            name=col_to_metric[col],
            display_order=order,
            has_moe=_column_has_values(df, moe_column_name(col)),
            has_percentage=_column_has_values(df, col + PERCENT),
            has_moe_pp=_column_has_values(df, col + MOE_PP),
            key=keys.get(col_to_metric[col]),
        )
        for order, col in enumerate(base_cols)
    ]

    def numeric_or_none(row, col):
        return None if col not in df.columns or pd.isna(row[col]) else float(row[col])

    values = []
    geo_rows = []
    for _, row in df.iterrows():
        geoid = row["Geography"]
        if pd.isna(geoid):
            continue
        # The raw file's "Geography" column holds the Census Bureau's long ID, e.g.
        # "1500000US150010201001" or "2500000US5048" — the geographies table stores
        # just the part after "US" ("150010201001" / "5048"), so strip it to match.
        raw_geoid = str(geoid)
        geoid = raw_geoid.split("US")[-1]

        geo_rows.append(
            geography_row(
                geoid,
                row["Geographic Area Name"],
                row["Census_Population"],
                raw_geoid.startswith("2500000US"),
            )
        )

        for col in base_cols:
            moe_derived_col = col + MOE_DERIVED
            values.append(Value(
                geoid=geoid,
                metric=col_to_metric[col],
                absolute=None if pd.isna(row[col]) else float(row[col]),
                margin_of_error=numeric_or_none(row, moe_column_name(col)),
                percentage=numeric_or_none(row, col + PERCENT),
                moe_percentage_points=numeric_or_none(row, col + MOE_PP),
                cv=numeric_or_none(row, col + CV),
                moe_derived=(
                    None
                    if moe_derived_col not in df.columns or pd.isna(row[moe_derived_col])
                    else bool(row[moe_derived_col])
                ),
            ))

    return metrics, values, geo_rows


# output is one record from clean.dataset_outputs; its name is the dataset id and the CSV file name. Returns the metric names
async def load_dataset(
    conn: asyncpg.Connection, output: dict, csv_path: str, seen_geoids: set[str], keys: dict[str, str]
) -> list[str]:
    dataset = Dataset(
        id=output["name"],
        label=output["label"],
        source_type="census",
        hawaiian_homelands=output["hawaiian_homelands"],
        universe=output["universe"],
        metadata=output["metadata"],
    )
    metrics, values, geo_rows = read_dataset_rows(csv_path, output["skip_metric_column"], keys)

    geo_rows = [r for r in geo_rows if r[0] not in seen_geoids]
    seen_geoids.update(r[0] for r in geo_rows)

    async with conn.transaction():
        await conn.executemany(
            """
            INSERT INTO geographies (
                geoid, type, name, block_group, census_tract, county, state, population
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (geoid) DO UPDATE SET
                type         = EXCLUDED.type,
                name         = EXCLUDED.name,
                block_group  = EXCLUDED.block_group,
                census_tract = EXCLUDED.census_tract,
                county       = EXCLUDED.county,
                state        = EXCLUDED.state,
                population   = EXCLUDED.population
            """,
            geo_rows,
        )
        value_count = await save_dataset(conn, dataset, metrics, values)

    print(f"  {dataset.id}: {len(metrics)} metrics, {value_count} metric_values rows")
    return [metric.name for metric in metrics]


# If --dir given, skip cleaning and use that folder. Else, run the full
# raw-to-cleaned pipeline and return the folder its output landed in.
def resolve_cleaned_dir(args: argparse.Namespace) -> str:
    if args.dir:
        return args.dir

    cleaned_dir = args.output_dir or tempfile.mkdtemp(prefix="ccsvi-cleaned-")

    print(f"Cleaning raw datasets into {cleaned_dir} ...")
    clean.run_full_cleaning(
        args.config,
        args.notes_xlsx,
        args.raw_dir,
        output_dir=cleaned_dir,
    )

    block_group_populations = proportions.load_block_group_populations(args.boundaries_geojson)
    clean.add_percentages_to_directory(
        cleaned_dir,
        args.config,
        block_group_populations,
    )

    return cleaned_dir


# Loads one CSV per config output from cleaned_dir, in name order, then stops if a menu indicator matched no metric
async def main(cleaned_dir: str, config_path: str) -> None:
    outputs = sorted(clean.dataset_outputs(clean.load_dataset_config(config_path)), key=lambda output: output["name"])
    menu = {(indicator["dataset"], indicator["metric"]): indicator["key"] for indicator in census_indicators()}
    print(f"Loading {len(outputs)} CSV file(s) from {cleaned_dir}")

    conn = await asyncpg.connect(settings.database_url())
    try:
        seen_geoids: set[str] = set()
        loaded: set[tuple[str, str]] = set()
        for output in outputs:
            keys = {metric: key for (dataset, metric), key in menu.items() if dataset == output["name"]}
            csv_path = os.path.join(cleaned_dir, f"{output['name']}.csv")
            names = await load_dataset(conn, output, csv_path, seen_geoids, keys)
            loaded.update((output["name"], name) for name in names)

        if unmatched := [f"{key}: {dataset} / {metric}" for (dataset, metric), key in menu.items() if (dataset, metric) not in loaded]:
            raise SystemExit("Census menu indicators with no metric:\n  " + "\n  ".join(unmatched))
        print(f"Done; all {len(menu)} census menu indicators have their key.")
    finally:
        await conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--dir", help="Skip cleaning — load a folder of already-cleaned census CSVs instead"
    )
    parser.add_argument("--raw-dir", default=str(settings.CENSUS_RAW_DIR))
    parser.add_argument("--config", default=DEFAULT_CONFIG_PATH)
    parser.add_argument("--notes-xlsx", default=str(settings.CENSUS_NOTES_XLSX))
    parser.add_argument("--boundaries-geojson", default=DEFAULT_BOUNDARIES_GEOJSON)
    parser.add_argument("--output-dir", default=str(settings.CENSUS_CLEANED_DIR))
    parser.add_argument("--clean-only", action="store_true", help="Clean the raw files into --output-dir and stop")
    args = parser.parse_args()

    if args.clean_only:
        resolve_cleaned_dir(args)
    else:
        asyncio.run(main(resolve_cleaned_dir(args), args.config))
