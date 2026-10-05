"""Runs every dataset in a config file through the census_transform steps."""

import json
import os

from openpyxl import load_workbook

from . import census_transform, io_utils, proportions, recipes


# Reads the dataset list from a config file, resolving relative raw file paths against base_path
def load_dataset_config(config_path: str, base_path: str = "") -> list:
    with open(os.path.expanduser(config_path), "r") as f:
        config = json.load(f)

    if base_path:
        base_path = os.path.expanduser(base_path)
        for dataset in config["datasets"]:
            if not os.path.isabs(dataset["original_file_path"]):
                dataset["original_file_path"] = os.path.join(base_path, dataset["original_file_path"])

    return config["datasets"]


# Copies one dataset's raw file to the centralized folder, then maps aliases and drops columns
def process_census_dataset(key: str, alias: str, original_file_path: str, file_blocks: dict, central_path_head: str):
    centralized_file_dir = os.path.join(central_path_head, alias)
    file_blocks[key]["original_file_path"] = original_file_path
    file_blocks[key]["centralized_file_dir"] = centralized_file_dir

    file_name = os.path.basename(original_file_path)
    file_path = os.path.join(centralized_file_dir, file_name)

    io_utils.copy_file(original_file_path, centralized_file_dir)

    cols_to_drop = file_blocks[key]["cols_to_drop"]
    column_mapping_dict = file_blocks[key]["code_to_alias_column_mappings"]

    print(f"Processing {alias}")

    alias_df = census_transform.map_census_aliases(file_path, column_mapping_dict)
    processed_df = census_transform.census_drop_cols(alias_df, cols_to_drop)

    return processed_df


# Runs every dataset listed in config_path through process_census_dataset, keyed by alias
def load_and_process_all_datasets(config_path: str, base_path: str, file_blocks: dict, central_path_head: str) -> dict:
    dataset_configs = load_dataset_config(config_path, base_path)

    processed_datasets = {}

    for config in dataset_configs:
        processed_datasets[config["alias"]] = process_census_dataset(
            key=config["key"],
            alias=config["alias"],
            original_file_path=config["original_file_path"],
            file_blocks=file_blocks,
            central_path_head=central_path_head,
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
                "original_file_path": "",
                "centralized_file_dir": "",
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


# One record per output file, from the config
# A normal entry is one file named after its alias
# An entry with "outputs" lists its files. 
def dataset_outputs(dataset_configs: list) -> list:
    outputs = []
    for config in dataset_configs:
        for output in config.get("outputs", [dict(config, name=config["alias"])]):
            outputs.append(
                {
                    "name": output["name"],
                    "label": output["label"],
                    "hawaiian_homelands": output["hawaiian_homelands"],
                    "percent_denominator": output["percent_denominator"],
                    "skip_metric_column": output.get("skip_metric_column"),
                }
            )
    return outputs


"""
Runs every dataset in the config from raw CSV to its final cleaned:
Returns {output file name: cleaned_df}
If output_dir is given, also writes each out as a csv.
"""
def run_full_cleaning(
    config_path: str,
    base_path: str,
    notes_wb_path: str,
    central_path_head: str,
    output_dir: str = None,
) -> dict:
    dataset_configs = load_dataset_config(config_path, base_path)
    file_blocks = build_file_blocks(notes_wb_path)

    aliases = [config["alias"] for config in dataset_configs]
    duplicates = sorted({alias for alias in aliases if aliases.count(alias) > 1})
    if duplicates:
        raise ValueError(f"Duplicate alias in config: {duplicates}")
    if set(aliases) != set(recipes.RECIPES):
        raise ValueError(
            f"Config and RECIPES list different datasets. Only in config: {sorted(set(aliases) - set(recipes.RECIPES))}. "
            f"Only in RECIPES: {sorted(set(recipes.RECIPES) - set(aliases))}"
        )
    for alias, (_, extra_inputs) in recipes.RECIPES.items():
        missing = [name for name in extra_inputs if name not in aliases]
        if missing:
            raise ValueError(f"RECIPES[{alias!r}] needs {missing}, which are not config aliases")
    for config in dataset_configs:
        if config["key"] not in file_blocks:
            raise ValueError(
                f"{config['alias']}: key {config['key']!r} is not a section in the JPL notes spreadsheet. "
                f"Sections found: {sorted(file_blocks)}"
            )

    datasets = load_and_process_all_datasets(config_path, base_path, file_blocks, central_path_head)

    cleaned = {}
    for alias in aliases:
        recipe, extra_inputs = recipes.RECIPES[alias]
        result = datasets[alias] if recipe is None else recipe(datasets[alias], *(datasets[name] for name in extra_inputs))
        if isinstance(result, dict):
            cleaned.update(result)
        else:
            cleaned[alias] = result

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
    base_path: str,
    block_group_populations: dict,
    hawaiian_homelands_populations: dict,
) -> None:
    cleaned_dir = os.path.expanduser(cleaned_dir)
    total_population = sum(block_group_populations.values()) + sum(hawaiian_homelands_populations.values())

    for output in dataset_outputs(load_dataset_config(config_path, base_path)):
        csv_file = os.path.join(cleaned_dir, f"{output['name']}.csv")
        print(f"Adding proportions to {output['name']}.csv...")
        df_with_props = proportions.add_percentages_to_csv(
            csv_file,
            total_population,
            block_group_populations,
            hawaiian_homelands_populations,
            output["hawaiian_homelands"],
            denominator_column=output["percent_denominator"],
        )
        df_with_props.to_csv(csv_file, index=False)
