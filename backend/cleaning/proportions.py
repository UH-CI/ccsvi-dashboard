"""Adds block-group population and percentage columns to cleaned census CSVs."""

import json
import os

import pandas as pd


def load_block_group_populations(geojson_path: str) -> dict:
    with open(os.path.expanduser(geojson_path), "r") as f:
        data = json.load(f)

    populations = {}
    for feature in data["features"]:
        geoid = str(feature["properties"]["geoid20"])
        populations[f"1500000US{geoid}"] = feature["properties"]["pop20"]

    return populations


def load_hawaiian_homelands_populations(geojson_path: str) -> dict:
    with open(os.path.expanduser(geojson_path), "r") as f:
        data = json.load(f)

    populations = {}
    for feature in data["features"]:
        geoid = str(feature["properties"]["GEOID10"])
        populations[geoid] = feature["properties"]["POP10"]

    return populations


"""
Adds a Census_Population column and a "(%)" column for every numeric metric
column in a cleaned CSV, using the GeoID -> population lookups passed in.
"""
def add_percentages_to_csv(
    csv_path: str,
    total_population: int,
    block_group_populations: dict,
    hawaiian_homelands_populations: dict,
) -> pd.DataFrame:
    df = pd.read_csv(csv_path)

    filename = os.path.basename(csv_path)
    is_hawaiian_homelands = "hawaiian_homelands" in filename.lower()

    if is_hawaiian_homelands:
        def get_hh_population(geo_id):
            geo_id_str = str(geo_id) if not pd.isna(geo_id) else None
            if geo_id_str is None:
                return None
            if "US" in geo_id_str:
                geo_id_str = geo_id_str.split("US")[1]
            return hawaiian_homelands_populations.get(geo_id_str, None)

        block_populations = df["Geography"].apply(get_hh_population)

        found_count = block_populations.notna().sum()
        total_count = len(block_populations)
        print(f"  → Found {found_count}/{total_count} Hawaiian Homelands populations")
        if found_count == 0:
            print(f"  ⚠ WARNING: No populations found! Sample Geography IDs: {df['Geography'].head(3).tolist()}")
            print(f"  ⚠ Available population keys: {list(hawaiian_homelands_populations.keys())[:5]}")
    else:
        block_populations = df["Geography"].map(block_group_populations)

        found_count = block_populations.notna().sum()
        total_count = len(block_populations)
        print(f"  → Found {found_count}/{total_count} block group populations")

    # Add Census_Population right after Geographic Area Name, replacing it if it already exists
    if "Census_Population" in df.columns:
        df["Census_Population"] = block_populations
        print(f"  → Updated existing Census_Population column in {filename}")
    else:
        df.insert(2, "Census_Population", block_populations)
        print(f"  → Added Census_Population column to {filename}")

    # Drop any previously computed (%) columns before recomputing, to avoid duplicates
    existing_pct_cols = [col for col in df.columns if " (%)" in col]
    df = df.drop(columns=existing_pct_cols)

    metric_cols = [
        col
        for col in df.columns
        if col not in ["Geography", "Geographic Area Name", "Census_Population"]
        and not col.startswith("Margin of Error")
        and "(Per Capita)" not in col
    ]

    pct_cols = {}
    for col in metric_cols:
        if pd.api.types.is_numeric_dtype(df[col]):
            pct_cols[col] = (df[col] / block_populations) * 100

    # Insert each percentage column immediately after its absolute value column
    new_order = []
    for col in df.columns:
        new_order.append(col)
        if col in pct_cols:
            prop_col = f"{col} (%)"
            df[prop_col] = pct_cols[col]
            new_order.append(prop_col)
    df = df[new_order]

    df = df.replace([float("inf"), float("-inf")], None)

    return df