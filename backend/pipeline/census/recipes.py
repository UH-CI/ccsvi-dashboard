"""
Per-dataset totals ("JPL Notes Cleaning" steps) — each sums a specific set of
estimate columns into CALCULATED totals. RECIPES at the bottom list every dataset
by alias; the pipeline calls each recipe with the dataset's own raw table, then any
other raw tables its RECIPES line names, and saves what it returns: one table, or
several tables keyed by output file name when one dataset makes several files.
Recipes only read raw tables and never change a table they are given, so order does not matter.
"""

import pandas as pd

from .csv_format import ESTIMATE_PREFIX, moe_column_name


def _estimate_total_cols(df: pd.DataFrame) -> list:
    return [col for col in df.columns if len(col) == 2 and col[1].startswith("Estimate!!Total:!!")]


# Finds the raw "Estimate!!Total:" universe column (not a "!!" subcategory of it)
def _total_universe_col(df: pd.DataFrame):
    for col in df.columns:
        if len(col) == 2 and col[1] == "Estimate!!Total:":
            return col
    raise ValueError("Raw table has no 'Estimate!!Total:' column, which its recipe needs as the percentage denominator")


# Finds the "Margin of Error!!..." column matching an estimate column, if the source has one
def _moe_col_for(df: pd.DataFrame, estimate_col):
    alias = estimate_col[1]
    if not alias.startswith(ESTIMATE_PREFIX):
        return None

    moe_alias = moe_column_name(alias)
    for col in df.columns:
        if len(col) == 2 and col[1] == moe_alias:
            return col
    return None


# Copies an estimate column into cleaned_df along with its margin of error, so recipes that
# rebuild their output column by column don't silently leave the margin behind
def _carry_with_moe(cleaned_df: pd.DataFrame, df: pd.DataFrame, estimate_col) -> None:
    cleaned_df[estimate_col] = df[estimate_col]

    moe_col = _moe_col_for(df, estimate_col)
    if moe_col is not None:
        cleaned_df[moe_col] = df[moe_col]


# Lines up another table's rows with df's rows by geography ID; errors if a place is missing
def _rows_matching_geoids(df: pd.DataFrame, other: pd.DataFrame) -> pd.DataFrame:
    geo_col = ("GEO_ID", "Geography")
    return other.set_axis(other[geo_col], axis=0).loc[df[geo_col]].set_axis(df.index, axis=0)


# Sums estimate columns into a CALCULATED total. Stays blank when every input is blank, so
# places the Census left empty aren't reported as 0.
def _sum_estimates(df: pd.DataFrame, estimate_cols: list) -> pd.Series:
    return df[estimate_cols].apply(pd.to_numeric, errors="coerce").sum(axis=1, min_count=1)


# Combines MOEs for a sum of ACS estimates: sqrt(sum of squared MOEs). For zero-estimate
# components, only the largest MOE among them is counted, not all of them.
def _sum_moe(df: pd.DataFrame, estimate_cols: list) -> pd.Series:
    pairs = [(col, _moe_col_for(df, col)) for col in estimate_cols]
    pairs = [(est_col, moe_col) for est_col, moe_col in pairs if moe_col is not None]

    if not pairs:
        return pd.Series([None] * len(df), index=df.index, dtype="object")

    estimates = {est_col: pd.to_numeric(df[est_col], errors="coerce") for est_col, _ in pairs}
    moes = {moe_col: pd.to_numeric(df[moe_col], errors="coerce") for _, moe_col in pairs}

    def combine(i) -> float | None:
        zero_moes = []
        sum_of_squares = 0.0
        any_moe = False

        for est_col, moe_col in pairs:
            moe_val = moes[moe_col].iat[i]
            if pd.isna(moe_val):
                continue
            any_moe = True

            est_val = estimates[est_col].iat[i]
            if est_val == 0:
                zero_moes.append(moe_val)
            else:
                sum_of_squares += moe_val**2

        if not any_moe:
            return None
        if zero_moes:
            sum_of_squares += max(zero_moes) ** 2
        return sum_of_squares**0.5

    return pd.Series([combine(i) for i in range(len(df))], index=df.index)


# Adds a CALCULATED total of estimate_cols and its margin of error to target_df, at position if given, else at the end
def _add_total(target_df: pd.DataFrame, df: pd.DataFrame, name: str, estimate_cols: list, position: int | None = None) -> None:
    estimate_col = ("CALCULATED", name)
    moe_col = ("CALCULATED", moe_column_name(name))
    if position is None:
        target_df[estimate_col] = _sum_estimates(df, estimate_cols)
        target_df[moe_col] = _sum_moe(df, estimate_cols)
    else:
        target_df.insert(position, estimate_col, _sum_estimates(df, estimate_cols))
        target_df.insert(position + 1, moe_col, _sum_moe(df, estimate_cols))


# Adds "Total Housing Built Before 1990" and "Total Housing Built Before 1970" columns,
# and carries through the raw total-housing-units column so it can be used as a
# percentage denominator
def recipe_age_of_structure(df: pd.DataFrame) -> pd.DataFrame:
    cleaned_df = df.iloc[:, :2].copy()
    _carry_with_moe(cleaned_df, df, _total_universe_col(df))

    cols_before_1970, cols_before_1990 = [], []
    for col in _estimate_total_cols(df):
        col_alias = col[1]

        if (
            "1960 to 1969" in col_alias
            or "1950 to 1959" in col_alias
            or "1940 to 1949" in col_alias
            or "1939 or earlier" in col_alias
        ):
            cols_before_1970.append(col)
            cols_before_1990.append(col)
        elif "1970 to 1979" in col_alias or "1980 to 1989" in col_alias:
            cols_before_1990.append(col)

    _add_total(cleaned_df, df, "Total Housing Built Before 1990", cols_before_1990)
    _add_total(cleaned_df, df, "Total Housing Built Before 1970", cols_before_1970)

    return cleaned_df


# Adds a "Total Overcrowded Housing Units" column (owner + renter households above
# 1.0 occupants per room), and carries through the raw total-occupied-units column
# so it can be used as a percentage denominator
def recipe_tenure_by_occupants_per_room(df: pd.DataFrame) -> pd.DataFrame:
    cleaned_df = df.iloc[:, :2].copy()
    _carry_with_moe(cleaned_df, df, _total_universe_col(df))

    overcrowded_cols = []
    for col in _estimate_total_cols(df):
        col_alias = col[1]

        if (
            "1.01 to 1.50 occupants per room" in col_alias
            or "1.51 to 2.00 occupants per room" in col_alias
            or "2.01 or more occupants per room" in col_alias
        ):
            overcrowded_cols.append(col)

    _add_total(cleaned_df, df, "Total Overcrowded Housing Units", overcrowded_cols)

    return cleaned_df


# Adds a "Total Single-Parent Households With Children" column (male + female
# householder, no spouse present, with own children under 18), and carries through
# the raw total-families column so it can be used as a percentage denominator
def recipe_family_type_by_children(df: pd.DataFrame) -> pd.DataFrame:
    cleaned_df = df.iloc[:, :2].copy()
    _carry_with_moe(cleaned_df, df, _total_universe_col(df))

    single_parent_labels = (
        "Estimate!!Total:!!Other family:!!Male householder, no spouse present:!!With own children of the householder under 18 years:",
        "Estimate!!Total:!!Other family:!!Female householder, no spouse present:!!With own children of the householder under 18 years:",
    )
    single_parent_cols = [col for col in _estimate_total_cols(df) if col[1] in single_parent_labels]

    _add_total(cleaned_df, df, "Total Single-Parent Households With Children", single_parent_cols)

    return cleaned_df


# Adds a single "No Health Insurance Coverage" column
def recipe_health_insurance(df: pd.DataFrame) -> pd.DataFrame:
    cleaned_df = df.iloc[:, :2].copy()
    _carry_with_moe(cleaned_df, df, _total_universe_col(df))
    cols_to_sum = _estimate_total_cols(df)
    _add_total(cleaned_df, df, "No Health Insurance Coverage", cols_to_sum)
    return cleaned_df


# Inserts a "Total Limited English Speaking Households" column after the first two columns
def recipe_limited_english_speaking(df: pd.DataFrame) -> pd.DataFrame:
    cleaned_df = df.copy()
    cols_to_sum = _estimate_total_cols(df)
    _add_total(cleaned_df, df, "Total Limited English Speaking Households", cols_to_sum, position=2)
    return cleaned_df


# Inserts a 'Total "Living alone"' column after the first two columns
def recipe_living_arrangements(df: pd.DataFrame) -> pd.DataFrame:
    cleaned_df = df.copy()
    cols_to_sum = [col for col in _estimate_total_cols(df) if col[1].endswith("!!Living alone")]
    _add_total(cleaned_df, df, 'Total "Living alone"', cols_to_sum, position=2)
    return cleaned_df


# Adds Under 100% / 150% / 200% FPL totals, bucketing the income-to-poverty-ratio columns
def recipe_income_share_of_fpl(df: pd.DataFrame) -> pd.DataFrame:
    cleaned_df = df.iloc[:, :2].copy()
    _carry_with_moe(cleaned_df, df, _total_universe_col(df))

    under_1_cols, under_1_5_cols, under_2_cols = [], [], []

    for col in _estimate_total_cols(df):
        col_alias = col[1]

        if "Under .50" in col_alias or ".50 to .99" in col_alias:
            under_1_cols.append(col)
            under_1_5_cols.append(col)
            under_2_cols.append(col)
        elif "1.00 to 1.24" in col_alias or "1.25 to 1.49" in col_alias:
            under_1_5_cols.append(col)
            under_2_cols.append(col)
        elif "1.50 to 1.84" in col_alias or "1.85 to 1.99" in col_alias:
            under_2_cols.append(col)

    _add_total(cleaned_df, df, "Total Under 100% FPL", under_1_cols)
    _add_total(cleaned_df, df, "Total Under 150% FPL", under_1_5_cols)
    _add_total(cleaned_df, df, "Total Under 200% FPL", under_2_cols)

    return cleaned_df


def _age_bucket_cols(df: pd.DataFrame, sex_prefix: str) -> tuple:
    under_5_cols, under_18_cols, over_65_cols = [], [], []

    for col in df.columns:
        if len(col) == 2 and col[1].startswith(sex_prefix):
            col_alias = col[1]

            if "Under 5" in col_alias:
                under_5_cols.append(col)
                under_18_cols.append(col)
            elif "5 to 9" in col_alias or "10 to 14" in col_alias or "15 to 17" in col_alias:
                under_18_cols.append(col)
            elif (
                "65 and 66" in col_alias
                or "67 to 69" in col_alias
                or "70 to 74" in col_alias
                or "75 to 79" in col_alias
                or "80 to 84" in col_alias
                or "85" in col_alias
            ):
                over_65_cols.append(col)

    return under_5_cols, under_18_cols, over_65_cols

"""
Splits the persons-under-5/65 dataset into outputs: overall gender totals,
combined (male + female) age-bucket totals (under 5, under 18, over 65), and
the original male-only/female-only age-bucket totals (kept for reference,
no longer exposed as SVI indicators). Returns a dict of {output_name:
dataframe} since one dataset produces multiple separate CSVs.
"""
def recipe_person_under_5_65(df: pd.DataFrame) -> dict:
    total_col = _total_universe_col(df)

    genders_df = df.iloc[:, :2].copy()
    _carry_with_moe(genders_df, df, total_col)
    _carry_with_moe(genders_df, df, ("B01001_002E", "Estimate!!Total:!!Male:"))
    _carry_with_moe(genders_df, df, ("B01001_026E", "Estimate!!Total:!!Female:"))

    males_under_5, males_under_18, males_over_65 = _age_bucket_cols(df, "Estimate!!Total:!!Male:!!")
    females_under_5, females_under_18, females_over_65 = _age_bucket_cols(df, "Estimate!!Total:!!Female:!!")

    # Combined (male + female) age-bucket totals — the consolidated SVI indicators.
    total_df = df.iloc[:, :2].copy()
    _carry_with_moe(total_df, df, total_col)
    under_5_cols = males_under_5 + females_under_5
    under_18_cols = males_under_18 + females_under_18
    over_65_cols = males_over_65 + females_over_65
    _add_total(total_df, df, "Total Under 5", under_5_cols)
    _add_total(total_df, df, "Total Under 18", under_18_cols)
    _add_total(total_df, df, "Total Over 65", over_65_cols)

    # Segregated male/female age-bucket totals — kept for reference, no longer
    # exposed as SVI indicators (see sviCategories.ts).
    males_df = df.iloc[:, :2].copy()
    _carry_with_moe(males_df, df, total_col)
    _add_total(males_df, df, "Males Under 5", males_under_5)
    _add_total(males_df, df, "Males Under 18", males_under_18)
    _add_total(males_df, df, "Males Over 65", males_over_65)

    females_df = df.iloc[:, :2].copy()
    _carry_with_moe(females_df, df, total_col)
    _add_total(females_df, df, "Females Under 5", females_under_5)
    _add_total(females_df, df, "Females Under 18", females_under_18)
    _add_total(females_df, df, "Females Over 65", females_over_65)

    return {
        "genders": genders_df,
        "person_under_5_65_total": total_df,
        "person_under_5_65_males": males_df,
        "person_under_5_65_females": females_df,
    }


"""
Adds Under 5 / Under 18 / Over 65 population totals for Hawaiian Homelands, plus an
Under 150% FPL total so the poverty bands nest like income_share_of_fpl's do.
"""
def recipe_hawaiian_homelands(df: pd.DataFrame) -> pd.DataFrame:
    cleaned_df = df.iloc[:, :2].copy()

    for col in df.columns:
        if len(col) == 2 and col[1] == "Estimate!!Total!!Total population":
            _carry_with_moe(cleaned_df, df, col)
            break

    under_5_cols, under_18_cols, over_65_cols = [], [], []

    for col in df.columns:
        if len(col) == 2 and col[1].startswith("Estimate!!Total!!Total population!!"):
            col_alias = col[1]

            if "Under 5" in col_alias:
                under_5_cols.append(col)
                under_18_cols.append(col)
            elif "5 to 17" in col_alias:
                under_18_cols.append(col)
            elif "65 to 74" in col_alias or "75" in col_alias:
                over_65_cols.append(col)

    _add_total(cleaned_df, df, "Total Population Under 5", under_5_cols)
    _add_total(cleaned_df, df, "Total Population Under 18", under_18_cols)
    _add_total(cleaned_df, df, "Total Population Over 65", over_65_cols)

    # Both bands are already percentages of the same poverty universe, so they add directly
    under_1_5_cols = [
        col
        for col in df.columns
        if len(col) == 2
        and col[1].startswith("Estimate!!Total!!POVERTY STATUS")
        and ("Below 100 percent" in col[1] or "100 to 149 percent" in col[1])
    ]

    _add_total(cleaned_df, df, "Total Under 150% FPL", under_1_5_cols)

    cleaned_df = pd.concat([cleaned_df, df.iloc[:, 10:].copy()], axis=1)

    return cleaned_df


# aggregate_vehicles' own raw table has no household-count column (it only has the vehicle
# sums, split by owner/renter occupied) — borrow tenure's total occupied housing units,
# since that's the same owner/renter-occupied universe this dataset is split by.
# Matched by geography ID, not row order.
def merge_tenure_households(vehicles_df: pd.DataFrame, tenure_raw_df: pd.DataFrame) -> pd.DataFrame:
    tenure_df = _rows_matching_geoids(vehicles_df, tenure_raw_df)
    merged = vehicles_df.copy()
    _carry_with_moe(merged, tenure_df, _total_universe_col(tenure_df))
    return merged


# One line per dataset alias: the recipe to run (None = write the raw cleaned table as is) and any other datasets' raw tables it needs.
# A recipe returns one table, or a dict of {output file name: table} when one dataset makes several files.
RECIPES = {
    "age_of_structure": (recipe_age_of_structure, []),
    "aggregate_vehicles": (merge_tenure_households, ["tenure"]),
    "health_insurance": (recipe_health_insurance, []),
    "households_w_computer": (None, []),
    "internet_subscription": (None, []),
    "limited_english_speaking": (recipe_limited_english_speaking, []),
    "living_arrangements": (recipe_living_arrangements, []),
    "income_share_of_fpl": (recipe_income_share_of_fpl, []),
    "person_under_5_65": (recipe_person_under_5_65, []),
    "population_group_quarters": (None, []),
    "race_origin": (None, []),
    "tenure": (None, []),
    "tenure_by_occupants_per_room": (recipe_tenure_by_occupants_per_room, []),
    "family_type_by_children": (recipe_family_type_by_children, []),
    "2022_census_hawaiian_homelands": (recipe_hawaiian_homelands, []),
}
