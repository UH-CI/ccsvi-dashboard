"""Reads the map layer files in config/layers/ and the census menu in config/census_menu.json, and
checks them. Every backend part that needs a layer gets it from here, so they all read the same entry.

python -m pipeline.check_layers                    every check, including the files on the VM
python -m pipeline.check_layers --static           only the checks that need no data files
python -m pipeline.check_layers --census-metrics   the census menu against the loaded metrics
"""

import argparse
import asyncio
import functools
import json
import zipfile
from dataclasses import dataclass
from pathlib import Path

import asyncpg

import settings
from pipeline.build_tools import run

LAYERS_DIR = Path(__file__).resolve().parents[2] / "config" / "layers"
CENSUS_MENU = LAYERS_DIR.parent / "census_menu.json"
CENSUS_CONFIG = Path(__file__).resolve().parent / "census" / "config" / "census_datasets_config.json"
SHAPES = {"polygons": "MultiPolygon", "lines": "MultiLineString"}

# The census menu's fields, as (required, optional)
CATEGORY_FIELDS = ({"id", "label", "indicators"}, {"description"})
INDICATOR_FIELDS = ({"dataset", "metric", "label"}, {"description", "calculationDescription", "off"})

# Per layer file, the fields each kind of entry must have and may have, as (required, optional).
# A top-level layer has either subLayers or the file fields; a sub-layer always has the file fields
LAYER_FIELDS = ({"id", "name", "icon", "color"}, {"description", "metadata", "off", "subLayers"})
SUB_LAYER_FIELDS = ({"id", "name", "color"}, {"description", "off"})
FIELDS = {
    "rasters": {
        "layer": (LAYER_FIELDS[0] | {"units", "opacity"}, LAYER_FIELDS[1]),
        "sub": (SUB_LAYER_FIELDS[0] | {"units", "opacity"}, SUB_LAYER_FIELDS[1]),
        "file": ({"file", "source", "nodata", "colormap"}, set()),
    },
    "polygons": {
        "layer": LAYER_FIELDS,
        "sub": SUB_LAYER_FIELDS,
        "file": ({"file", "source"}, {"keep", "rowFilter", "tileFlags", "popup", "markers"}),
    },
    "lines": {
        "layer": LAYER_FIELDS,
        "sub": SUB_LAYER_FIELDS,
        "file": ({"file", "source"}, {"keep", "rowFilter", "tileFlags", "popup"}),
    },
}


@dataclass
class Raster:
    id: str  # "<parent id>.<sub id>" for a sub-layer, as the map and the API name it
    label: str  # "<parent name>: <sub name>" for a sub-layer
    file: str  # COG file name in RASTER_DIR
    data_file: Path  # the COG the loaders read
    zips: list  # the zip, inside RAW_DIR
    inner: str  # path of the source file inside the zip
    nodata: int


@dataclass
class ShapeLayer:
    id: str  # "<parent id>.<sub id>" for a sub-layer, as the map and the API name it
    layer_id: str  # hazards.hazard_id
    sub_id: str | None  # hazards.sub_id
    file: str  # output file stem; also the map tiles' layer name
    data_file: Path  # the GeoJSON the loader reads
    shape: str  # MultiPolygon or MultiLineString
    zips: list  # zips, outermost first, starting inside RAW_DIR
    inner: str  # shapefile inside the last zip
    keep: list | None  # columns to keep; None keeps all
    row_filter: str | None  # SQL condition for rows to keep; None keeps all
    tile_flags: list  # extra tippecanoe settings
    markers: bool  # also make one map pin per shape
    popup_columns: list  # the columns the popup names


# Every layer and sub-layer as (id, entry, parent); a sub-layer's id is "<parent id>.<sub id>"
def walk(layers):
    for layer in layers:
        yield layer.get("id"), layer, None
        for sub in layer.get("subLayers", []):
            yield f"{layer.get('id')}.{sub.get('id')}", sub, layer


def is_off(entry, parent):
    return entry.get("off", False) or (parent or {}).get("off", False)


def repeats(values):
    return sorted({value for value in values if values.count(value) > 1})


# The columns a popup names: its title column, then its listed fields
def popup_columns(entry):
    popup = entry.get("popup", {})
    return ([popup["title"]] if "title" in popup else []) + [field["key"] for field in popup.get("fields", [])]


def field_problems(kind, entry, required, optional):
    problems = []
    if missing := required - entry.keys():
        problems.append(f"missing {', '.join(sorted(missing))}")
    if unknown := entry.keys() - required - optional:
        problems.append(f"unknown field {', '.join(sorted(unknown))}")
    source = entry.get("source")
    if source is not None and (
        source.keys() != {"zips", "inner"} or not source["zips"] or kind == "rasters" and len(source["zips"]) != 1
    ):
        problems.append("source must be zips (exactly one for a raster) and the file inside the last")
    if "keep" in entry and (outside := set(popup_columns(entry)) - set(entry["keep"])):
        problems.append(f"popup column not in keep: {', '.join(sorted(outside))}")
    return problems


# A comma or colon in an id would break the shared link; a dot in a parent id would break splitting "<parent>.<sub>"
def id_problems(entry, parent):
    banned = ",:" if parent else ",:."
    found = [char for char in banned if char in str(entry.get("id"))]
    return [f"id contains {' '.join(repr(char) for char in found)}"] if found else []


# Problems found in the files alone; switched-off entries only need a unique, well-formed id
def static_problems(files):
    found = {kind: list(walk(layers)) for kind, layers in files.items()}
    all_ids = [id_ for entries in found.values() for id_, _, _ in entries]
    problems = [f"{id_}: id used twice" for id_ in repeats(all_ids)]
    for kind, entries in found.items():
        fields = FIELDS[kind]
        for id_, entry, parent in entries:
            problems += [f"{id_}: {problem}" for problem in id_problems(entry, parent)]
            if is_off(entry, parent):
                continue
            required, optional = fields["sub"] if parent else fields["layer"]
            if parent or "subLayers" not in entry:
                required, optional = required | fields["file"][0], optional | fields["file"][1]
            problems += [f"{id_}: {problem}" for problem in field_problems(kind, entry, required, optional)]
    # Rasters and the shape layers are written to different folders
    for kinds in (["rasters"], list(SHAPES)):
        names = [entry["file"] for kind in kinds for _, entry, _ in live_files(files[kind])]
        problems += [f"{name}: file used twice" for name in repeats(names)]
    return problems


def stop_on(problems):
    for problem in problems:
        print(f"  FAIL {problem}")
    if problems:
        raise SystemExit(f"{len(problems)} problem(s) in the layer files in {LAYERS_DIR}")


# Every layer file, once they all pass the static checks
def read_checked():
    files = {kind: json.loads((LAYERS_DIR / f"{kind}.json").read_text())["layers"] for kind in FIELDS}
    stop_on(static_problems(files))
    return files


# Every switched-on entry with a file, as (id, entry, parent)
def live_files(layers):
    return [
        (id_, entry, parent)
        for id_, entry, parent in walk(layers)
        if "file" in entry and not is_off(entry, parent)
    ]


def rasters():
    return [
        Raster(
            id=id_,
            label=f"{parent['name']}: {entry['name']}" if parent else entry["name"],
            file=entry["file"],
            data_file=settings.RASTER_DIR / entry["file"],
            zips=entry["source"]["zips"],
            inner=entry["source"]["inner"],
            nodata=entry["nodata"],
        )
        for id_, entry, parent in live_files(read_checked()["rasters"])
    ]


# Every switched-on line and polygon layer with a file
def shape_layers():
    files = read_checked()
    return [
        ShapeLayer(
            id=id_,
            layer_id=(parent or entry)["id"],
            sub_id=entry["id"] if parent else None,
            file=entry["file"],
            data_file=settings.HAZARD_GEOJSON_DIR / f"{entry['file']}.geojson",
            shape=shape,
            zips=entry["source"]["zips"],
            inner=entry["source"]["inner"],
            keep=entry.get("keep"),
            row_filter=entry.get("rowFilter"),
            tile_flags=entry.get("tileFlags", []),
            markers=entry.get("markers", False),
            popup_columns=popup_columns(entry),
        )
        for kind, shape in SHAPES.items()
        for id_, entry, parent in live_files(files[kind])
    ]


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


# Every census dataset id, an entry's alias or the names of its outputs when it is split into several,
# with whether it is a Hawaiian Homelands dataset
def census_datasets():
    entries = json.loads(CENSUS_CONFIG.read_text())["datasets"]
    split = {output["name"]: output["hawaiian_homelands"] for entry in entries for output in entry.get("outputs", [])}
    return split | {entry["alias"]: entry["hawaiian_homelands"] for entry in entries if "outputs" not in entry}


def census_categories():
    return json.loads(CENSUS_MENU.read_text())["categories"]


# Every indicator, switched off or not, so one switched back on still works
def census_pairs():
    return [(i["dataset"], i["metric"]) for category in census_categories() for i in category["indicators"]]


def census_problems():
    categories = census_categories()
    dataset_ids = census_datasets()
    problems = [f"category {id_}: id used twice" for id_ in repeats([c.get("id") for c in categories])]
    live = []
    for category in categories:
        problems += [f"category {category.get('id')}: {p}" for p in field_problems("census", category, *CATEGORY_FIELDS)]
        for indicator in category.get("indicators", []):
            name = f"{indicator.get('dataset')} / {indicator.get('metric')}"
            problems += [f"{name}: {p}" for p in field_problems("census", indicator, *INDICATOR_FIELDS)]
            if indicator.get("dataset") not in dataset_ids:
                problems.append(f"{name}: no census dataset with that id")
            if not indicator.get("off"):
                live.append((indicator.get("dataset"), indicator.get("metric")))
    problems += [f"{dataset} / {metric}: in the menu twice" for dataset, metric in repeats(live)]
    return problems


def census_metric_problems():
    async def fetch_metrics():
        conn = await asyncpg.connect(settings.database_url())
        try:
            return await conn.fetch("SELECT dataset_id, name FROM metrics")
        finally:
            await conn.close()

    loaded = {(row["dataset_id"], row["name"]) for row in asyncio.run(fetch_metrics())}
    return [f"{d} / {m}: no such metric after the census load" for d, m in census_pairs() if (d, m) not in loaded]


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--static", action="store_true", help="skip the checks that need the data files")
    parser.add_argument("--census-metrics", action="store_true", help="check the census menu against the loaded metrics")
    args = parser.parse_args()

    stop_on(census_problems())
    if args.census_metrics:
        stop_on(census_metric_problems())
        print(f"Census menu ok: all {len(census_pairs())} indicators have a metric")
        return

    found_rasters, found_shapes = rasters(), shape_layers()
    if not args.static:
        found = found_rasters + found_shapes
        stop_on(source_problems(found) + data_file_problems(found) + popup_problems(found_shapes))
    print(f"Layer files ok: {len(found_rasters)} rasters, {len(found_shapes)} lines and polygons, "
          f"{len(census_pairs())} census indicators")


if __name__ == "__main__":
    main()
