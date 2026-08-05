"""Core census CSV cleaning: alias mapping, column dropping, export."""

import csv
import os

import pandas as pd


"""
Census datasets are double headered (a code row and a name row). This maps
each alias to its code and returns a multiindex dataframe using both.
"""
def map_census_aliases(file_path: str, column_mapping_dict: dict) -> pd.DataFrame:
    file_path = os.path.expanduser(file_path)

    # csv module handles quoted fields better than pandas for the header rows
    with open(file_path, "r", newline="", encoding="utf-8-sig") as f:
        csv_reader = csv.reader(f)
        codes = next(csv_reader)
        names = next(csv_reader)

        names = [name.strip("'\"") for name in names]
        names = [" ".join(name.split()) for name in names]

        column_mapping_dict.update(dict(zip(names, codes)))

    df = pd.read_csv(file_path, skiprows=[0], encoding="utf-8-sig")
    df.columns = pd.MultiIndex.from_tuples(list(zip(codes, names)), names=["Code", "Alias"])

    return df


"""
Drops the given estimate columns and their matching moe columns
from a multiindex df, plus any column that's both unlabeled and empty.
"""
def census_drop_cols(df: pd.DataFrame, cols_to_drop: list) -> pd.DataFrame:
    column_names = df.columns.names

    aliases = df.columns.get_level_values("Alias")
    codes = df.columns.get_level_values("Code")

    alias_to_col = {}
    for col, alias in zip(df.columns, aliases):
        clean_alias = "" if pd.isna(alias) else str(alias).strip('"').strip().rstrip(":")
        alias_to_col[clean_alias] = col

    columns_to_drop = set()

    for remove_col in cols_to_drop:
        clean_remove_col = "" if pd.isna(remove_col) else str(remove_col).strip('"').strip().rstrip(":")

        if clean_remove_col in alias_to_col:
            columns_to_drop.add(alias_to_col[clean_remove_col])

            if clean_remove_col.startswith("Estimate!!"):
                margin_col = "Margin of Error!!" + clean_remove_col[len("Estimate!!"):]
                if margin_col in alias_to_col:
                    columns_to_drop.add(alias_to_col[margin_col])

    for col, alias, code in zip(df.columns, aliases, codes):
        clean_alias = "" if pd.isna(alias) else str(alias).strip('"').strip().rstrip(":")
        clean_code = "" if pd.isna(code) else str(code).strip('"').strip().rstrip(":")

        has_empty_header = clean_alias == "" or clean_code == ""
        has_values = not df[col].isna().all()

        if has_empty_header and not has_values:
            columns_to_drop.add(col)

    columns_to_drop = list(columns_to_drop)

    cleaned_df = df.drop(columns=columns_to_drop)
    cleaned_df.columns.names = column_names

    return cleaned_df


"""
Writes a multi-index df out as a single-header CSV, using the alias row
only (codes are dropped). Set overwrite=True to replace an existing file.
"""
def export_census_csv(df: pd.DataFrame, output_dir: str, filename: str, overwrite: bool = False) -> bool:
    try:
        output_path = os.path.join(os.path.expanduser(output_dir), filename)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        if os.path.exists(output_path) and not overwrite:
            raise FileExistsError(f"File {filename} already exists and overwrite=False")

        aliases = df.columns.get_level_values("Alias")
        codes = df.columns.get_level_values("Code")

        cleaned_aliases = []
        for alias, code in zip(aliases, codes):
            cleaned = alias.replace('"', "").replace('"', "").strip() if isinstance(alias, str) else alias
            if code == "CALCULATED":
                cleaned = f"{cleaned} (calc.)"
            cleaned_aliases.append(cleaned)

        temp_df = df.copy()

        with open(output_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(cleaned_aliases)

            temp_df.columns = cleaned_aliases
            temp_df.to_csv(f, index=False, header=False)

        print(f"Exported to {output_path}")
        return True

    except Exception as e:
        print(f"Error exporting CSV: {str(e)}")
        return False


# Strips a Census prefix (e.g. "Estimate!!Total:!!") and tidies up the rest of the name
def clean_column_name(col_name: str, prefixes_to_remove: list) -> str:
    for prefix in prefixes_to_remove:
        if col_name.startswith(prefix):
            col_name = col_name[len(prefix):]
            break

    cleaned_name = col_name.replace("!!", " ")
    cleaned_name = " ".join(cleaned_name.split())
    cleaned_name = cleaned_name.rstrip(":")

    return cleaned_name