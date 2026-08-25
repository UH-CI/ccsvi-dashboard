"""
Per-dataset totals ("JPL Notes Cleaning" steps) — each sums a specific set of
estimate columns into one or more CALCULATED totals. Registered in RECIPES so
the cleaning pipeline can look one up by dataset key instead of hardcoding it inline.
"""

import pandas as pd


def _estimate_total_cols(df: pd.DataFrame) -> list:
    return [col for col in df.columns if len(col) == 2 and col[1].startswith("Estimate!!Total:!!")]


# Finds the raw "Estimate!!Total:" universe column (not a "!!" subcategory of it)
def _total_universe_col(df: pd.DataFrame):
    for col in df.columns:
        if len(col) == 2 and col[1] == "Estimate!!Total:":
            return col
    return None


# Finds the "Margin of Error!!..." column matching an estimate column, if the source has one
def _moe_col_for(df: pd.DataFrame, estimate_col):
    alias = estimate_col[1]
    if not alias.startswith("Estimate!!"):
        return None

    moe_alias = "Margin of Error!!" + alias[len("Estimate!!"):]
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


"""
Combines moe for sum of ACS estimates, per the census bureau
approximation formula: sqrt(sum of squared MOEs)
- Columns with no matching MOE in the source are skipped
- When several summed components have an estimate of 0, only the largest of their MOEs is counted
- Returns None for a row where none of the summed columns had an MOE to begin wit
"""
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


# Adds a single "Total Housing Built Before 1990" column, and carries through the
# raw total-housing-units column so it can be used as a percentage denominator
def recipe_age_of_structure(df: pd.DataFrame) -> pd.DataFrame:
    cleaned_df = df.iloc[:, :2].copy()
    total_col = _total_universe_col(df)
    if total_col is not None:
        _carry_with_moe(cleaned_df, df, total_col)
    cols_to_sum = _estimate_total_cols(df)
    cleaned_df[("CALCULATED", "Total Housing Built Before 1990")] = df[cols_to_sum].sum(axis=1)
    cleaned_df[("CALCULATED", "Margin of Error!!Total Housing Built Before 1990")] = _sum_moe(df, cols_to_sum)
    return cleaned_df


# Adds a single "No Health Insurance Coverage" column
def recipe_health_insurance(df: pd.DataFrame) -> pd.DataFrame:
    cleaned_df = df.iloc[:, :2].copy()
    total_col = _total_universe_col(df)
    if total_col is not None:
        _carry_with_moe(cleaned_df, df, total_col)
    cols_to_sum = _estimate_total_cols(df)
    cleaned_df[("CALCULATED", "No Health Insurance Coverage")] = df[cols_to_sum].sum(axis=1)
    cleaned_df[("CALCULATED", "Margin of Error!!No Health Insurance Coverage")] = _sum_moe(df, cols_to_sum)
    return cleaned_df


# Inserts a "Total Limited English Speaking Households" column after the first two columns
def recipe_limited_english_speaking(df: pd.DataFrame) -> pd.DataFrame:
    cleaned_df = df.copy()
    cols_to_sum = _estimate_total_cols(df)
    cleaned_df.insert(2, ("CALCULATED", "Total Limited English Speaking Households"), df[cols_to_sum].sum(axis=1))
    cleaned_df.insert(
        3,
        ("CALCULATED", "Margin of Error!!Total Limited English Speaking Households"),
        _sum_moe(df, cols_to_sum),
    )
    return cleaned_df


# Inserts a 'Total "Living alone"' column after the first two columns
def recipe_living_arrangements(df: pd.DataFrame) -> pd.DataFrame:
    cleaned_df = df.copy()
    cols_to_sum = _estimate_total_cols(df)
    cleaned_df.insert(2, ("CALCULATED", 'Total "Living alone"'), df[cols_to_sum].sum(axis=1))
    cleaned_df.insert(3, ("CALCULATED", 'Margin of Error!!Total "Living alone"'), _sum_moe(df, cols_to_sum))
    return cleaned_df


# Adds Under 100% / 150% / 200% FPL totals, bucketing the income-to-poverty-ratio columns
def recipe_income_share_of_fpl(df: pd.DataFrame) -> pd.DataFrame:
    cleaned_df = df.iloc[:, :2].copy()
    total_col = _total_universe_col(df)
    if total_col is not None:
        _carry_with_moe(cleaned_df, df, total_col)

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

    cleaned_df[("CALCULATED", "Total Under 100% FPL")] = df[under_1_cols].sum(axis=1)
    cleaned_df[("CALCULATED", "Margin of Error!!Total Under 100% FPL")] = _sum_moe(df, under_1_cols)
    cleaned_df[("CALCULATED", "Total Under 150% FPL")] = df[under_1_5_cols].sum(axis=1)
    cleaned_df[("CALCULATED", "Margin of Error!!Total Under 150% FPL")] = _sum_moe(df, under_1_5_cols)
    cleaned_df[("CALCULATED", "Total Under 200% FPL")] = df[under_2_cols].sum(axis=1)
    cleaned_df[("CALCULATED", "Margin of Error!!Total Under 200% FPL")] = _sum_moe(df, under_2_cols)

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
Splits the persons-under-5/65 dataset into three outputs: overall gender
totals, and male/female age-bucket totals (under 5, under 18, over 65).
Returns a dict of {output_name: dataframe} since one dataset produces three
separate CSVs.
"""
def recipe_person_under_5_65(df: pd.DataFrame) -> dict:
    total_col = _total_universe_col(df)

    genders_df = df.iloc[:, :2].copy()
    if total_col is not None:
        _carry_with_moe(genders_df, df, total_col)
    _carry_with_moe(genders_df, df, ("B01001_002E", "Estimate!!Total:!!Male:"))
    _carry_with_moe(genders_df, df, ("B01001_026E", "Estimate!!Total:!!Female:"))

    males_under_5, males_under_18, males_over_65 = _age_bucket_cols(df, "Estimate!!Total:!!Male:!!")
    males_df = df.iloc[:, :2].copy()
    if total_col is not None:
        _carry_with_moe(males_df, df, total_col)
    males_df[("CALCULATED", "Males Under 5")] = df[males_under_5].sum(axis=1)
    males_df[("CALCULATED", "Margin of Error!!Males Under 5")] = _sum_moe(df, males_under_5)
    males_df[("CALCULATED", "Males Under 18")] = df[males_under_18].sum(axis=1)
    males_df[("CALCULATED", "Margin of Error!!Males Under 18")] = _sum_moe(df, males_under_18)
    males_df[("CALCULATED", "Males Over 65")] = df[males_over_65].sum(axis=1)
    males_df[("CALCULATED", "Margin of Error!!Males Over 65")] = _sum_moe(df, males_over_65)

    females_under_5, females_under_18, females_over_65 = _age_bucket_cols(df, "Estimate!!Total:!!Female:!!")
    females_df = df.iloc[:, :2].copy()
    if total_col is not None:
        _carry_with_moe(females_df, df, total_col)
    females_df[("CALCULATED", "Females Under 5")] = df[females_under_5].sum(axis=1)
    females_df[("CALCULATED", "Margin of Error!!Females Under 5")] = _sum_moe(df, females_under_5)
    females_df[("CALCULATED", "Females Under 18")] = df[females_under_18].sum(axis=1)
    females_df[("CALCULATED", "Margin of Error!!Females Under 18")] = _sum_moe(df, females_under_18)
    females_df[("CALCULATED", "Females Over 65")] = df[females_over_65].sum(axis=1)
    females_df[("CALCULATED", "Margin of Error!!Females Over 65")] = _sum_moe(df, females_over_65)

    return {"genders": genders_df, "males": males_df, "females": females_df}


"""
Adds Under 5 / Under 18 / Over 65 population totals for Hawaiian Homelands,
then appends the trailing poverty-status columns (kept as-is from source).
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

    cleaned_df[("CALCULATED", "Total Population Under 5")] = df[under_5_cols].apply(pd.to_numeric, errors="coerce").sum(axis=1)
    cleaned_df[("CALCULATED", "Margin of Error!!Total Population Under 5")] = _sum_moe(df, under_5_cols)
    cleaned_df[("CALCULATED", "Total Population Under 18")] = df[under_18_cols].apply(pd.to_numeric, errors="coerce").sum(axis=1)
    cleaned_df[("CALCULATED", "Margin of Error!!Total Population Under 18")] = _sum_moe(df, under_18_cols)
    cleaned_df[("CALCULATED", "Total Population Over 65")] = df[over_65_cols].apply(pd.to_numeric, errors="coerce").sum(axis=1)
    cleaned_df[("CALCULATED", "Margin of Error!!Total Population Over 65")] = _sum_moe(df, over_65_cols)

    cleaned_df = pd.concat([cleaned_df, df.iloc[:, 10:-4].copy()], axis=1)

    return cleaned_df


# The Hawaiian Homelands source also carries poverty-status columns that belong on the FPL dataset
def merge_hawaiian_homelands_poverty(fpl_df: pd.DataFrame, hawaiian_homelands_raw_df: pd.DataFrame) -> pd.DataFrame:
    return pd.concat([fpl_df, hawaiian_homelands_raw_df.iloc[:, -4:].copy()], axis=1)


# aggregate_vehicles' own raw table has no household-count column (it only has the vehicle
# sums, split by owner/renter occupied) — borrow tenure's total occupied housing units,
# since that's the same owner/renter-occupied universe this dataset is split by
def merge_tenure_households(vehicles_df: pd.DataFrame, tenure_raw_df: pd.DataFrame) -> pd.DataFrame:
    total_col = _total_universe_col(tenure_raw_df)
    merged = vehicles_df.copy()
    if total_col is not None:
        _carry_with_moe(merged, tenure_raw_df, total_col)
    return merged


RECIPES = {
    "age_of_structure": recipe_age_of_structure,
    "health_insurance_coverage_by_age": recipe_health_insurance,
    "limited_english_speaking_households": recipe_limited_english_speaking,
    "living_arragements_including_living_alone_by_sex_and_relationship": recipe_living_arrangements,
    "income_share_of_fpl": recipe_income_share_of_fpl,
    "persons_under_5_65_years_table": recipe_person_under_5_65,
    "2022_census_hawaiian_homelands": recipe_hawaiian_homelands,
}
