"""
Per-dataset totals ("JPL Notes Cleaning" steps): each total is the sum of named raw estimate
columns, saved as a CALCULATED column with its margin of error. Most datasets list their totals
in the config and add_totals builds them; CODED_RECIPES holds the few that need code.
cleaned_tables picks which applies to a dataset. Recipes only read raw tables and never change
a table they are given, so order does not matter.
"""

import pandas as pd

from .csv_format import ESTIMATE_PREFIX, moe_column_name


# The raw column with exactly this name; stops if the table has none
def _column(df: pd.DataFrame, name: str):
    for col in df.columns:
        if len(col) == 2 and col[1] == name:
            return col
    raise ValueError(f"Raw table has no column {name!r}")


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


# Adds a CALCULATED total of estimate_cols and its margin of error to the end of target_df
def _add_total(target_df: pd.DataFrame, df: pd.DataFrame, name: str, estimate_cols: list) -> None:
    target_df[("CALCULATED", name)] = _sum_estimates(df, estimate_cols)
    target_df[("CALCULATED", moe_column_name(name))] = _sum_moe(df, estimate_cols)


# Builds a dataset from its config totals: place columns, the denominator column, then each total; keep_raw_columns puts the totals first and keeps every raw column after them
def add_totals(df: pd.DataFrame, totals: list, denominator: str, keep_raw_columns: bool) -> pd.DataFrame:
    cleaned_df = df.iloc[:, :2].copy()
    if not keep_raw_columns:
        _carry_with_moe(cleaned_df, df, _column(df, denominator))

    for total in totals:
        _add_total(cleaned_df, df, total["name"], [_column(df, name) for name in total["columns"]])

    if keep_raw_columns:
        cleaned_df = pd.concat([cleaned_df, df.iloc[:, 2:]], axis=1)
    return cleaned_df


# Age labels in the age-by-sex table, by the total they add up to
AGE_GROUPS = {
    "Under 5": ["Under 5 years"],
    "Under 18": ["Under 5 years", "5 to 9 years", "10 to 14 years", "15 to 17 years"],
    "Over 65": ["65 and 66 years", "67 to 69 years", "70 to 74 years", "75 to 79 years", "80 to 84 years", "85 years and over"],
}


# The age-by-sex table's four files: total, male and female counts; age-group totals for both sexes; and the same for each sex alone (off the menu)
def recipe_person_under_5_65(df: pd.DataFrame) -> dict:
    total_col = _column(df, "Estimate!!Total:")

    genders_df = df.iloc[:, :2].copy()
    for name in ["Estimate!!Total:", "Estimate!!Total:!!Male:", "Estimate!!Total:!!Female:"]:
        _carry_with_moe(genders_df, df, _column(df, name))
    tables = {"genders": genders_df}

    for file_name, prefix, sexes in [
        ("person_under_5_65_total", "Total", ["Male", "Female"]),
        ("person_under_5_65_males", "Males", ["Male"]),
        ("person_under_5_65_females", "Females", ["Female"]),
    ]:
        table = df.iloc[:, :2].copy()
        _carry_with_moe(table, df, total_col)
        for group, ages in AGE_GROUPS.items():
            columns = [_column(df, f"Estimate!!Total:!!{sex}:!!{age}") for sex in sexes for age in ages]
            _add_total(table, df, f"{prefix} {group}", columns)
        tables[file_name] = table
    return tables


HOMELANDS_AGE = "Estimate!!Total!!Total population!!AGE!!"
HOMELANDS_POVERTY = "Estimate!!Total!!POVERTY STATUS IN THE PAST 12 MONTHS!!Population for whom poverty status is determined!!"

# Homelands totals; its values are already percentages of one universe, so they add directly
HOMELANDS_TOTALS = [
    {"name": "Total Population Under 5", "columns": [HOMELANDS_AGE + "Under 5 years"]},
    {"name": "Total Population Under 18", "columns": [HOMELANDS_AGE + "Under 5 years", HOMELANDS_AGE + "5 to 17 years"]},
    {"name": "Total Population Over 65", "columns": [HOMELANDS_AGE + "65 to 74 years", HOMELANDS_AGE + "75 years and over"]},
    {
        "name": "Total Under 150% FPL",
        "columns": [
            HOMELANDS_POVERTY + "Below 100 percent of the poverty level",
            HOMELANDS_POVERTY + "100 to 149 percent of the poverty level",
        ],
    },
]


# Homelands: its total population and totals, then its raw columns from the first one after the age columns on
def recipe_hawaiian_homelands(df: pd.DataFrame) -> pd.DataFrame:
    cleaned_df = add_totals(df, HOMELANDS_TOTALS, "Estimate!!Total!!Total population", keep_raw_columns=False)
    first_kept = df.columns.get_loc(_column(df, "Estimate!!Total!!Total population!!SEX!!Male"))
    return pd.concat([cleaned_df, df.iloc[:, first_kept:]], axis=1)


# Datasets cleaned by code, by alias; a recipe returns one table, or {output file name: table}
CODED_RECIPES = {
    "person_under_5_65": recipe_person_under_5_65,
    "2022_census_hawaiian_homelands": recipe_hawaiian_homelands,
}


# One dataset's cleaned tables as {output file name: table}: its coded recipe, else its config totals, else its raw table as is
def cleaned_tables(config: dict, df: pd.DataFrame) -> dict:
    alias = config["alias"]
    if alias in CODED_RECIPES:
        result = CODED_RECIPES[alias](df)
        return result if isinstance(result, dict) else {alias: result}
    if "totals" in config:
        return {alias: add_totals(df, config["totals"], config["percent_denominator"], config.get("keep_raw_columns", False))}
    return {alias: df}
