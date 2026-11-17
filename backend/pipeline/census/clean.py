"""Runs every dataset in a config file through the census_transform steps."""

import os
import re

from openpyxl import load_workbook

from registry import dataset_entries, load_dataset_config

from . import census_transform, io_utils, proportions, recipes

# Each Census product in a raw file name, as the Census Bureau names it in citations
CENSUS_PRODUCTS = {
    "ACSDT5Y": "American Community Survey 5-Year Estimates Detailed Tables",
    "ACSST5Y": "American Community Survey 5-Year Estimates Subject Tables",
    "DECENNIALPL": "Decennial Census Redistricting Data (Public Law 94-171)",
}


# Where a dataset's raw file sits: raw_dir/<alias>/<file name from original_file_path>
def raw_file_path(raw_dir: str, config: dict) -> str:
    return os.path.join(os.path.expanduser(raw_dir), config["alias"], os.path.basename(config["original_file_path"]))


# Reads one dataset's raw file, then maps aliases and drops columns
def process_census_dataset(key: str, alias: str, file_path: str, file_blocks: dict):
    cols_to_drop = file_blocks[key]["cols_to_drop"]
    column_mapping_dict = file_blocks[key]["code_to_alias_column_mappings"]

    print(f"Processing {alias}")

    alias_df = census_transform.map_census_aliases(file_path, column_mapping_dict)
    processed_df = census_transform.census_drop_cols(alias_df, cols_to_drop)

    return processed_df


# Runs every dataset listed in config_path through process_census_dataset, keyed by alias
def load_and_process_all_datasets(config_path: str, file_blocks: dict, raw_dir: str) -> dict:
    dataset_configs = load_dataset_config(config_path)

    processed_datasets = {}

    for config in dataset_configs:
        processed_datasets[config["alias"]] = process_census_dataset(
            key=config["key"],
            alias=config["alias"],
            file_path=raw_file_path(raw_dir, config),
            file_blocks=file_blocks,
        )
        print("-" * 30)

    return processed_datasets


# Reads JPL notes spreadsheet into one block per bold row.
# A column only gets kept if "subfield to keep" cell has a value.
def build_file_blocks(notes_wb_path: str) -> dict:
    notes_wb = load_workbook(os.path.expanduser(notes_wb_path))
    sheet = notes_wb.active

    file_blocks = {}
    current_file_name = None
    cols_not_to_drop = ["Geography", "Geographic Area Name"]

    for row in sheet.iter_rows(min_row=1, max_col=3, values_only=False):
        cell_value = row[0].value
        is_bold = row[0].font.bold if row[0].font else False

        if is_bold and cell_value:
            original_name = cell_value.strip()
            current_file_name = io_utils.to_snake_case(original_name)
            file_blocks[current_file_name] = {
                "original_name": original_name,
                "cols_to_drop": [],
                "code_to_alias_column_mappings": {},
            }
            continue

        if current_file_name and any(col.value for col in row):
            col_name = row[0].value
            subfield_value = row[1].value
            if col_name and not subfield_value and col_name not in cols_not_to_drop:
                cleaned_col_name = col_name.strip().strip("'\"")
                cleaned_col_name = " ".join(cleaned_col_name.split())
                file_blocks[current_file_name]["cols_to_drop"].append(cleaned_col_name)

    return file_blocks


# A census table's author, title, citation in the Census Bureau's recommended form, the years it covers
# and its page on data.census.gov, from its title and raw file name
def census_metadata(file_name: str, official_table_title: str) -> dict:
    match = re.fullmatch(r"((ACSDT5Y|ACSST5Y|DECENNIALPL)(\d{4})\.(\w+))-Data\.csv", file_name)
    if not match:
        raise ValueError(f"Can't read the Census product and year from raw file name {file_name!r}")
    table_id, product, year, table = match.group(1), match.group(2), int(match.group(3)), match.group(4)
    product_name = CENSUS_PRODUCTS[product]
    return {
        "author": "U.S. Census Bureau",
        "title": official_table_title,
        "citation": f'U.S. Census Bureau, "{official_table_title}," {product_name}, Table {table}, {year}',
        "period": str(year) if product == "DECENNIALPL" else f"{year - 4}–{year}",
        "link": f"https://data.census.gov/table/{table_id}",
    }


# One record per output file, with its source details read from the raw file's name
def dataset_outputs(dataset_configs: list) -> list:
    return [
        {
            "name": output["name"],
            "label": output["label"],
            "universe": output["universe"],
            "hawaiian_homelands": output["hawaiian_homelands"],
            "percent_denominator": output["percent_denominator"],
            "skip_metric_column": output.get("skip_metric_column"),
            "metadata": census_metadata(os.path.basename(config["original_file_path"]), config["official_table_title"]),
            "counts_only": output.get("counts_only", False),
            "population_column": output.get("population_column"),
            "values_are_percentages": output.get("values_are_percentages", False),
            "no_percentage_columns": output.get("no_percentage_columns", []),
        }
        for config, output in dataset_entries(dataset_configs)
    ]


"""
Runs every dataset in the config from raw CSV to its final cleaned:
Returns {output file name: cleaned_df}
If output_dir is given, also writes each out as a csv.
"""
def run_full_cleaning(
    config_path: str,
    notes_wb_path: str,
    raw_dir: str,
    output_dir: str = None,
) -> dict:
    dataset_configs = load_dataset_config(config_path)
    file_blocks = build_file_blocks(notes_wb_path)

    aliases = [config["alias"] for config in dataset_configs]
    duplicates = sorted({alias for alias in aliases if aliases.count(alias) > 1})
    if duplicates:
        raise ValueError(f"Duplicate alias in config: {duplicates}")
    if missing := sorted(set(recipes.CODED_RECIPES) - set(aliases)):
        raise ValueError(f"CODED_RECIPES names {missing}, which are not config aliases")
    for config in dataset_configs:
        if config["key"] not in file_blocks:
            raise ValueError(
                f"{config['alias']}: key {config['key']!r} is not a section in the JPL notes spreadsheet. "
                f"Sections found: {sorted(file_blocks)}"
            )

    datasets = load_and_process_all_datasets(config_path, file_blocks, raw_dir)

    cleaned = {}
    for config in dataset_configs:
        cleaned.update(recipes.cleaned_tables(config, datasets[config["alias"]]))

    expected = [output["name"] for output in dataset_outputs(dataset_configs)]
    if sorted(cleaned) != sorted(expected):
        raise ValueError(
            f"Recipes produced different files than the config expects. Missing: {sorted(set(expected) - set(cleaned))}. "
            f"Unexpected: {sorted(set(cleaned) - set(expected))}"
        )

    if output_dir:
        for name, df in cleaned.items():
            census_transform.export_census_csv(df, output_dir, f"{name}.csv", overwrite=True)

    return cleaned


# Adds Census_Population and "(%)" columns to each config dataset's CSV in cleaned_dir, in place
def add_percentages_to_directory(
    cleaned_dir: str,
    config_path: str,
    block_group_populations: dict,
) -> None:
    cleaned_dir = os.path.expanduser(cleaned_dir)

    for output in dataset_outputs(load_dataset_config(config_path)):
        csv_file = os.path.join(cleaned_dir, f"{output['name']}.csv")
        print(f"Adding proportions to {output['name']}.csv...")
        df_with_props = proportions.add_percentages_to_csv(
            csv_file,
            block_group_populations,
            denominator_column=output["percent_denominator"],
            counts_only=output["counts_only"],
            population_column=output["population_column"],
            values_are_percentages=output["values_are_percentages"],
            no_percentage_columns=output["no_percentage_columns"],
        )
        df_with_props.to_csv(csv_file, index=False)
