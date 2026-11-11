"""Checks the map layer files and the census menu against the data they name: source zips, built files,
popup columns and cleaned census files. The checks on the files alone run in registry.py whenever they are read.

python -m pipeline.check_layers                    every check, including the files on the VM
python -m pipeline.check_layers --static           only the checks that need no data files
python -m pipeline.check_layers --census-files     the census menu against the cleaned census files
"""

import argparse
import csv
import functools
import json
import zipfile

import settings
from pipeline.build_tools import run
from pipeline.census.census_transform import metric_columns
from pipeline.census.clean import dataset_outputs, load_dataset_config
from registry import CENSUS_CONFIG, census_indicators, census_problems, rasters, shape_layers, stop_on


# The names inside a zip, or inside a zip within it; each zip is read once per run
@functools.cache
def zip_names(zips):
    archive = zipfile.ZipFile(settings.RAW_DIR / zips[0])
    for member in zips[1:]:
        archive = zipfile.ZipFile(archive.open(member))
    return set(archive.namelist())


def source_problems(found):
    problems = []
    for layer in found:
        if not (settings.RAW_DIR / layer.zips[0]).exists():
            problems.append(f"{layer.id}: no {settings.RAW_DIR / layer.zips[0]}")
            continue
        for depth, member in enumerate([*layer.zips[1:], layer.inner], start=1):
            if member not in zip_names(tuple(layer.zips[:depth])):
                problems.append(f"{layer.id}: no {member} in {layer.zips[depth - 1]}")
                break
    return problems


def data_file_problems(found):
    return [f"{layer.id}: no {layer.data_file}" for layer in found if not layer.data_file.exists()]


# Popup columns of the shape layers that keep every column, checked against their GeoJSON
def popup_problems(found):
    problems = []
    for layer in found:
        if layer.keep is None and layer.popup_columns and layer.data_file.exists():
            info = json.loads(run(["ogrinfo", "-json", "-so", "-ro", "-al", layer.data_file]))
            columns = {field["name"] for field in info["layers"][0]["fields"]}
            if missing := set(layer.popup_columns) - columns:
                problems.append(f"{layer.id}: popup column not in {layer.data_file.name}: {', '.join(sorted(missing))}")
    return problems


# Menu indicators whose metric isn't among the metrics their cleaned census file makes; run before a rebuild drops anything
def census_file_problems():
    skip_column = {output["name"]: output["skip_metric_column"] for output in dataset_outputs(load_dataset_config(CENSUS_CONFIG))}
    indicators = census_indicators()
    problems, names = [], {}
    for dataset in sorted({indicator["dataset"] for indicator in indicators}):
        path = settings.CENSUS_CLEANED_DIR / f"{dataset}.csv"
        if not path.exists():
            problems.append(f"{dataset}: no cleaned file {path}")
            continue
        with path.open(newline="") as file:
            names[dataset] = set(metric_columns(next(csv.reader(file)), skip_column[dataset], path.name).values())
    return problems + [
        f"{i['key']}: no metric \"{i['metric']}\" in {i['dataset']}.csv"
        for i in indicators
        if i["dataset"] in names and i["metric"] not in names[i["dataset"]]
    ]


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--static", action="store_true", help="skip the checks that need the data files")
    parser.add_argument("--census-files", action="store_true", help="check the census menu against the cleaned census files")
    args = parser.parse_args()

    stop_on(census_problems())
    if args.census_files:
        stop_on(census_file_problems())
        print(f"Census menu ok: all {len(census_indicators())} indicators have a metric in the cleaned files")
        return

    found_rasters, found_shapes = rasters(), shape_layers()
    if not args.static:
        found = found_rasters + found_shapes
        stop_on(source_problems(found) + data_file_problems(found) + popup_problems(found_shapes))
    print(f"Layer files ok: {len(found_rasters)} rasters, {len(found_shapes)} lines and polygons, "
          f"{len(census_indicators())} census indicators")


if __name__ == "__main__":
    main()
