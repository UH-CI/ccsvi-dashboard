"""Combines all cleaned census CSVs into one master JSON, keyed by GeoID, for the map."""

import glob
import json
import os

import pandas as pd

from .census_transform import clean_column_name

PREFIXES_TO_REMOVE = ["Estimate!!Total:!!", "Estimate!!Total!!", "Margin of Error!!", "!!Total:!!"]


"""
Reads every CSV in csv_directory and merges them into one JSON file per
GeoID, with absolute/margin-of-error/percentage nested per metric field.
Also flags any metric whose computed percentage exceeds 100%, since that
usually means a column shouldn't have been summed as a percentage base.
"""
def census_csvs_to_master_json(
    csv_directory: str,
    json_path: str,
    block_group_populations: dict,
    hawaiian_homelands_populations: dict,
) -> dict:
    csv_directory = os.path.expanduser(csv_directory)
    json_path = os.path.expanduser(json_path)

    os.makedirs(os.path.dirname(json_path), exist_ok=True)

    csv_files = glob.glob(os.path.join(csv_directory, "*.csv"))

    metrics = {}

    for csv_file in csv_files:
        csv_filename = os.path.basename(csv_file)
        census_metric_name = os.path.splitext(csv_filename)[0]

        try:
            na_values = ["", "-", "**", "null"]
            df = pd.read_csv(csv_file, na_values=na_values)

            for _, row in df.iterrows():
                geo_id = str(row["Geography"]) if not pd.isna(row["Geography"]) else None
                if geo_id is None:
                    continue

                original_geo_id = geo_id  # keep the original for population lookup

                # Remove the "1500000US" prefix for the JSON key (only for block groups)
                if isinstance(geo_id, str) and "US" in geo_id:
                    geo_id = geo_id.split("US")[1]

                geo_name = row["Geographic Area Name"]

                if geo_id not in metrics:
                    geo_name_parts = [part.strip() for part in geo_name.split(";")]

                    # Hawaiian Homelands rows don't follow the typical geo area name structure
                    if len(geo_name_parts) < 4:
                        population = hawaiian_homelands_populations.get(str(geo_id), None)
                        metrics[geo_id] = {
                            "type": "hawaiian_homeland",
                            "name": geo_name,
                            "block_group": None,
                            "census_tract": None,
                            "county": None,
                            "state": None,
                            "population": population,
                            "metrics": {},
                        }
                    else:
                        population = block_group_populations.get(original_geo_id, None)
                        metrics[geo_id] = {
                            "type": "block_group",
                            "name": geo_name,
                            "block_group": geo_name_parts[0],
                            "census_tract": geo_name_parts[1],
                            "county": geo_name_parts[2],
                            "state": geo_name_parts[3],
                            "population": population,
                            "metrics": {},
                        }

                if census_metric_name not in metrics[geo_id]["metrics"]:
                    metrics[geo_id]["metrics"][census_metric_name] = {}

                for col in df.columns:
                    if col in ["Geography", "Geographic Area Name"]:
                        continue

                    is_moe = col.startswith("Margin of Error")

                    field_name = clean_column_name(col, PREFIXES_TO_REMOVE)

                    # Strip the remaining "Total: "/"Total " prefix on MoE columns so they
                    # map onto the same key as their corresponding estimate column
                    if is_moe:
                        if field_name.startswith("Total: "):
                            field_name = field_name[len("Total: "):]
                        elif field_name.startswith("Total "):
                            field_name = field_name[len("Total "):]

                    if field_name not in metrics[geo_id]["metrics"][census_metric_name]:
                        metrics[geo_id]["metrics"][census_metric_name][field_name] = {
                            "absolute": None,
                            "margin_of_error": None,
                            "percentage": None,
                        }

                    value = None if pd.isna(row[col]) else int(row[col])

                    if is_moe:
                        metrics[geo_id]["metrics"][census_metric_name][field_name]["margin_of_error"] = value
                    else:
                        metrics[geo_id]["metrics"][census_metric_name][field_name]["absolute"] = value

        except Exception as e:
            print(f"Error processing {csv_file}: {e}")
            continue

    # percentage = (absolute / population) * 100 for that geography
    problematic_metrics = {}

    for geo_id in metrics:
        population = metrics[geo_id]["population"]

        if population is None or population == 0:
            continue

        for dataset_name in metrics[geo_id]["metrics"]:
            for field_name in metrics[geo_id]["metrics"][dataset_name]:
                absolute_value = metrics[geo_id]["metrics"][dataset_name][field_name]["absolute"]

                if absolute_value is not None:
                    percentage = (absolute_value / population) * 100
                    metrics[geo_id]["metrics"][dataset_name][field_name]["percentage"] = percentage

                    if percentage > 100:
                        key = (dataset_name, field_name)
                        problematic_metrics[key] = max(percentage, problematic_metrics.get(key, 0))
                else:
                    metrics[geo_id]["metrics"][dataset_name][field_name]["percentage"] = None

    if problematic_metrics:
        print("\n⚠ WARNING: The following metrics have percentages > 100%:")
        print("These may not be appropriate for percentage calculation (e.g., aggregate/total values)\n")
        for (dataset_name, field_name), max_pct in sorted(problematic_metrics.items()):
            print(f"  • {dataset_name} → '{field_name}' (max: {max_pct:.2f}%)")
        print()

    with open(json_path, "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"JSON at {json_path}")
    return metrics