"""Adds block-group population and percentage columns to cleaned census CSVs."""

import csv
import glob
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


# Builds {alias: percent_denominator} from the dataset config list (pipeline.load_dataset_config
# output), so the cleaning loop knows which column to divide by for each cleaned CSV by filename
def build_denominator_map(dataset_configs: list) -> dict:
    return {
        config["alias"]: config["percent_denominator"]
        for config in dataset_configs
        if config.get("percent_denominator")
    }


def moe_column_name(col: str) -> str:
    if col.startswith("Estimate!!"):
        return "Margin of Error!!" + col[len("Estimate!!"):]
    return "Margin of Error!!" + col


# Coefficient of variation MOE as a share of the estimate. NaN when estimate is 0
def _coefficient_of_variation(estimate: pd.Series, moe: pd.Series) -> pd.Series:
    return (moe / 1.645) / estimate.replace(0, float("nan")) * 100


# Adds Census_Population and, per numeric metric column, "(%)" / "(MOE pp)" / "(CV)" /
# "(MOE derived)". denominator_column, if given, replaces population as the divisor.
def add_percentages_to_csv(
    csv_path: str,
    total_population: int,
    block_group_populations: dict,
    hawaiian_homelands_populations: dict,
    denominator_column: str | None = None,
) -> pd.DataFrame:
    df = pd.read_csv(csv_path, na_values=["", "-", "**", "null"])

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
        print(f"  - Found {found_count}/{total_count} Hawaiian Homelands populations")
        if found_count == 0:
            print(f"  WARNING: No populations found! Sample Geography IDs: {df['Geography'].head(3).tolist()}")
            print(f"  Available population keys: {list(hawaiian_homelands_populations.keys())[:5]}")
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
    existing_derived_cols = [
        col
        for col in df.columns
        if " (%)" in col or " (MOE pp)" in col or " (CV)" in col or " (MOE derived)" in col
    ]
    df = df.drop(columns=existing_derived_cols)

    if denominator_column and denominator_column in df.columns:
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
        and not col.startswith("Margin of Error")
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

        already_pct = "hawaiian_homelands" in filename.lower() or "POVERTY STATUS IN THE PAST 12 MONTHS" in col

        if already_pct:
            pct_cols[col] = values.round(1)
        else:
            pct_cols[col] = ((values / denominator) * 100).round(1)

        moe_col = moe_column_name(col)
        if moe_col not in df.columns:
            continue
        moe_values = pd.to_numeric(df[moe_col], errors="coerce")

        if already_pct:
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

        cv_cols[col] = _coefficient_of_variation(values, moe_values).round(1)

        # metrics we calculate
        moe_derived_cols[col] = col.endswith("(calc.)")

    # Insert each derived column immediately after its absolute value column, in a
    # fixed order: (%), (MOE pp), (CV), (MOE derived)
    new_order = []
    for col in df.columns:
        new_order.append(col)
        if col in pct_cols:
            prop_col = f"{col} (%)"
            df[prop_col] = pct_cols[col]
            new_order.append(prop_col)
        if col in moe_pp_cols:
            moe_pp_col = f"{col} (MOE pp)"
            df[moe_pp_col] = moe_pp_cols[col]
            new_order.append(moe_pp_col)
        if col in cv_cols:
            cv_col = f"{col} (CV)"
            df[cv_col] = cv_cols[col]
            new_order.append(cv_col)
        if col in moe_derived_cols:
            moe_derived_col = f"{col} (MOE derived)"
            df[moe_derived_col] = moe_derived_cols[col]
            new_order.append(moe_derived_col)
    df = df[new_order]

    df = df.replace([float("inf"), float("-inf")], None)

    return df


"""
Scans every cleaned CSV's existing "(%)" columns and reports any values over 100%. A value over
100% usually means a column probably got compared against the wrong denominator (e.g.
a household/housing-unit count divided by population instead of households).
"""
def check_percentages_over_100(cleaned_path_head: str) -> dict:
    cleaned_path_head = os.path.expanduser(cleaned_path_head)
    csv_files = glob.glob(os.path.join(cleaned_path_head, "*.csv"))

    problematic = {}

    for csv_file in csv_files:
        filename = os.path.basename(csv_file)
        df = pd.read_csv(csv_file, na_values=["", "-", "**", "null"])
        pct_cols = [col for col in df.columns if col.endswith("(%)")]

        for col in pct_cols:
            values = pd.to_numeric(df[col], errors="coerce")
            over = values[values > 100]
            if len(over) > 0:
                problematic[(filename, col)] = (len(over), over.max())

    if problematic:
        print("\nWARNING: The following columns have percentages > 100%:")
        for (filename, col), (count, max_pct) in sorted(problematic.items()):
            print(f"  • {filename} :: '{col}' — {count} row(s), max {max_pct:.1f}%")
        print()
    else:
        print("✓ No percentage columns over 100% found.")

    return problematic


"""
Compares the ACS "Estimate!!Total:" population universe (read
straight from a raw population-based dataset, e.g. person_under_5_65) against
the 2020 Census pop20 baseline used as the percentage denominator everywhere.

Flags any block group where the difference exceeds the ACS's own stated
margin of error. Unlike check_percentages_over_100, this
catches mismatches both if ACS too high OR too low
"""
def check_population_source_mismatch(raw_dataset_dir: str, block_group_populations: dict) -> dict:
    raw_dataset_dir = os.path.expanduser(raw_dataset_dir)
    csv_files = glob.glob(os.path.join(raw_dataset_dir, "*.csv"))
    if not csv_files:
        print(f"  ⚠ No raw CSV found in {raw_dataset_dir}")
        return {}

    mismatches = {}
    with open(csv_files[0], newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        next(reader)  # codes row
        next(reader)  # names row
        for row in reader:
            if not row or not row[0]:
                continue
            geo = row[0]
            pop = block_group_populations.get(geo)
            if pop is None:
                continue

            est_str, moe_str = row[2], row[3]
            try:
                est = float(est_str)
                moe = float(moe_str) if moe_str not in ("", "-", "**", "null") else None
            except ValueError:
                continue

            diff = est - pop
            if moe is not None and abs(diff) > moe:
                mismatches[geo] = {"pop20": pop, "acs_estimate": est, "acs_moe": moe, "diff": diff}

    if mismatches:
        print(f"\nWARNING: {len(mismatches)} block group(s) where the ACS population estimate differs from the")
        print("2020 Census population by more than the ACS's own margin of error:\n")
        worst = sorted(mismatches.items(), key=lambda kv: -abs(kv[1]["diff"]))
        for geo, info in worst[:20]:
            print(f"  • {geo}: pop20={info['pop20']}  ACS={info['acs_estimate']:.0f} ± {info['acs_moe']:.0f}  diff={info['diff']:+.0f}")
        if len(mismatches) > 20:
            print(f"  ... and {len(mismatches) - 20} more")
        print()
    else:
        print("✓ No population source mismatches beyond the ACS's margin of error found.")

    return mismatches


"""
Shows actual population values behind the two denominator
choices: the 2020 Census pop20 baseline this pipeline actually uses, versus
that dataset's own raw ACS "Estimate!!Total:" (that survey's own reported
population/household count). Prints the block groups with the biggest gap
between the two, and how many rows would land over 100% under each choice,
so the two approaches can be weighed against each other with real numbers in
front of you, not just a count.
"""
def compare_population_denominators(cleaned_csv_path: str, raw_dataset_dir: str, top_n: int = 10) -> pd.DataFrame:
    cleaned_csv_path = os.path.expanduser(cleaned_csv_path)
    raw_dataset_dir = os.path.expanduser(raw_dataset_dir)

    df = pd.read_csv(cleaned_csv_path, na_values=["", "-", "**", "null"])

    raw_csv_files = glob.glob(os.path.join(raw_dataset_dir, "*.csv"))
    if not raw_csv_files:
        print(f"  ⚠ No raw CSV found in {raw_dataset_dir}")
        return pd.DataFrame()

    acs_totals = {}
    with open(raw_csv_files[0], newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        next(reader)  # codes row
        next(reader)  # names row
        for row in reader:
            if not row or not row[0]:
                continue
            try:
                acs_totals[row[0]] = float(row[2])
            except ValueError:
                continue

    pop_compare = df[["Geography", "Geographic Area Name", "Census_Population"]].copy()
    pop_compare["ACS_Total"] = df["Geography"].map(acs_totals)
    pop_compare["diff"] = pop_compare["ACS_Total"] - pop_compare["Census_Population"]

    filename = os.path.basename(cleaned_csv_path)
    print(f"\n{filename} — Census pop20 vs raw ACS 'Estimate!!Total:', biggest gaps first:\n")
    worst = pop_compare.reindex(pop_compare["diff"].abs().sort_values(ascending=False).index).head(top_n)
    print(worst.to_string(index=False))

    # For each metric column, show the actual computed percentage under both denominator
    # choices for these same worst-gap rows, plus how many rows land over 100% overall
    for pct_col in [c for c in df.columns if c.endswith("(%)")]:
        base_col = pct_col.replace(" (%)", "")
        if base_col not in df.columns:
            continue

        census_pct = pd.to_numeric(df[pct_col], errors="coerce")
        acs_pct = (pd.to_numeric(df[base_col], errors="coerce") / pop_compare["ACS_Total"]) * 100

        census_over = int((census_pct > 100).sum())
        acs_over = int((acs_pct > 100).sum())
        print(f"\n  '{pct_col}': {census_over} row(s) over 100% using Census, {acs_over} using the ACS total\n")

        detail = pop_compare.loc[worst.index, ["Geography"]].copy()
        detail[base_col] = df.loc[worst.index, base_col]
        detail["Census %"] = census_pct.loc[worst.index].round(1)
        detail["ACS %"] = acs_pct.loc[worst.index].round(1)
        print(detail.to_string(index=False))
    print()

    return pop_compare
