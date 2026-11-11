"""Checks for spotting census percentages worked out against the wrong population or household count."""

import csv
import glob
import os

import pandas as pd

from .csv_format import MISSING_VALUES, PERCENT


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
        df = pd.read_csv(csv_file, na_values=MISSING_VALUES)
        pct_cols = [col for col in df.columns if col.endswith(PERCENT)]

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
                moe = float(moe_str) if moe_str not in MISSING_VALUES else None
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

    df = pd.read_csv(cleaned_csv_path, na_values=MISSING_VALUES)

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
    for pct_col in [c for c in df.columns if c.endswith(PERCENT)]:
        base_col = pct_col.removesuffix(PERCENT)
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
