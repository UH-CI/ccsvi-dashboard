"""Runs every dataset in a config file through the census_transform steps."""

import json
import os

from . import census_transform, io_utils


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
        try:
            df = process_census_dataset(
                key=config["key"],
                alias=config["alias"],
                original_file_path=config["original_file_path"],
                file_blocks=file_blocks,
                central_path_head=central_path_head,
            )
            processed_datasets[config["alias"]] = df

        except Exception as e:
            print(f"Error processing {config['alias']}: {e}")
        print("-" * 30)

    return processed_datasets
