"""Adds block-group population and percentage columns to cleaned census CSVs."""

import json
import os

import pandas as pd

from .csv_format import (
    CALC,
    CV,
    DERIVED_ENDINGS,
    MISSING_VALUES,
    MOE_DERIVED,
    MOE_PP,
    MOE_PREFIX,
    PERCENT,
    moe_column_name,
)


def load_block_group_populations(geojson_path: str) -> dict:
    with open(os.path.expanduser(geojson_path), "r") as f:
        data = json.load(f)

    populations = {}
    for feature in data["features"]:
        geoid = str(feature["properties"]["geoid20"])
        populations[f"1500000US{geoid}"] = feature["properties"]["pop20"]

    return populations


# Coefficient of variation MOE as a share of the estimate. NaN when estimate is 0
def _coefficient_of_variation(estimate: pd.Series, moe: pd.Series) -> pd.Series:
    return (moe / 1.645) / estimate.replace(0, float("nan")) * 100


# Adds Census_Population and, per numeric metric column, "(%)" / "(MOE pp)" / "(CV)" /
# "(MOE derived)". denominator_column, if given, replaces population as the divisor.
# counts_only skips "(%)" and "(MOE pp)" so the app shows the raw counts instead.
# population_column, if given, is read as Census_Population in place of the 2020 block-group population.
# values_are_percentages keeps each value and margin as they are, rounded, instead of dividing them.
def add_percentages_to_csv(
    csv_path: str,
    block_group_populations: dict,
    denominator_column: str | None = None,
    counts_only: bool = False,
    population_column: str | None = None,
    values_are_percentages: bool = False,
) -> pd.DataFrame:
    df = pd.read_csv(csv_path, na_values=MISSING_VALUES)

    filename = os.path.basename(csv_path)

    if population_column:
        block_populations = df[population_column]
    else:
        block_populations = df["Geography"].map(block_group_populations)

        found_count = block_populations.notna().sum()
        total_count = len(block_populations)
        print(f"  → Found {found_count}/{total_count} block group populations")

    # Add Census_Population right after Geographic Area Name, replacing it if it already exists
    if "Census_Population" in df.columns:
        df["Census_Population"] = block_populations
        print(f"  - Updated existing Census_Population column in {filename}")
    else:
        df.insert(2, "Census_Population", block_populations)
        print(f"  - Added Census_Population column to {filename}")

    # Drop any previously computed (%) / (MOE pp) / (CV) / (MOE derived) columns before
    # recomputing, to avoid duplicates
    existing_derived_cols = [col for col in df.columns if col.endswith(DERIVED_ENDINGS)]
    df = df.drop(columns=existing_derived_cols)

    if denominator_column:
        if denominator_column not in df.columns:
            raise ValueError(f"{filename}: percent_denominator {denominator_column!r} is not a column in the file")
        denominator = pd.to_numeric(df[denominator_column], errors="coerce")
        print(f"  → Using '{denominator_column}' as the percentage denominator instead of population")
    else:
        denominator = pd.to_numeric(block_populations, errors="coerce")

    # 0 unless the denominator has its own MOE (an ACS column does, Census population does not)
    denominator_moe_col = moe_column_name(denominator_column) if denominator_column else None
    if denominator_moe_col and denominator_moe_col in df.columns:
        denominator_moe = pd.to_numeric(df[denominator_moe_col], errors="coerce")
    else:
        denominator_moe = pd.Series(0.0, index=df.index)

    metric_cols = [
        col
        for col in df.columns
        if col not in ["Geography", "Geographic Area Name", "Census_Population", denominator_column]
        and not col.startswith(MOE_PREFIX)
        and "(Per Capita)" not in col
        and "Median" not in col
    ]

    pct_cols = {}
    moe_pp_cols = {}
    cv_cols = {}
    moe_derived_cols = {}

    for col in metric_cols:
        if not pd.api.types.is_numeric_dtype(df[col]):
            continue

        values = df[col]

        if values_are_percentages:
            pct_cols[col] = values.round(1)
        else:
            pct_cols[col] = ((values / denominator) * 100).round(1)

        moe_col = moe_column_name(col)
        if moe_col not in df.columns:
            continue
        moe_values = pd.to_numeric(df[moe_col], errors="coerce")

        if values_are_percentages:
            # margin already a percentage
            moe_pp_cols[col] = moe_values.round(1)
        else:
            # Census's approximation formula for a proportion
            # (100/D) * sqrt(MOE_N^2 -+ p^2*MOE_D^2), p = N/D.
            # Falls back to "+" if "-" goes negative. moe_d = 0 differs to the simple 100*MOE_N/D.
            p = values / denominator
            radicand = moe_values**2 - (p**2) * (denominator_moe**2)
            radicand = radicand.where(radicand >= 0, moe_values**2 + (p**2) * (denominator_moe**2))
            moe_pp_cols[col] = ((100 / denominator) * radicand.pow(0.5)).round(1)

        # metrics we calculate
        moe_derived_cols[col] = col.endswith(CALC)

    if counts_only:
        pct_cols, moe_pp_cols = {}, {}

    # CV needs only a column's own estimate and MOE, so every column with an MOE gets one
    for col in df.columns:
        moe_col = moe_column_name(col)
        if col.startswith(MOE_PREFIX) or moe_col not in df.columns or not pd.api.types.is_numeric_dtype(df[col]):
            continue
        moe_values = pd.to_numeric(df[moe_col], errors="coerce")
        cv_cols[col] = _coefficient_of_variation(df[col], moe_values).round(1)

    # Insert each derived column immediately after its absolute value column, in a
    # fixed order: (%), (MOE pp), (CV), (MOE derived)
    new_order = []
    for col in df.columns:
        new_order.append(col)
        if col in pct_cols:
            prop_col = col + PERCENT
            df[prop_col] = pct_cols[col]
            new_order.append(prop_col)
        if col in moe_pp_cols:
            moe_pp_col = col + MOE_PP
            df[moe_pp_col] = moe_pp_cols[col]
            new_order.append(moe_pp_col)
        if col in cv_cols:
            cv_col = col + CV
            df[cv_col] = cv_cols[col]
            new_order.append(cv_col)
        if col in moe_derived_cols:
            moe_derived_col = col + MOE_DERIVED
            df[moe_derived_col] = moe_derived_cols[col]
            new_order.append(moe_derived_col)
    df = df[new_order]

    df = df.replace([float("inf"), float("-inf")], None)

    return df
