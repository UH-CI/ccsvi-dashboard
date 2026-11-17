"""Reads the hand-edited config files (the map layer files in config/layers/, the census menu and the census
dataset list) and hands out only entries that pass the checks on the files themselves.
"""

import json
import re
from dataclasses import dataclass
from pathlib import Path

import settings

LAYERS_DIR = Path(__file__).resolve().parents[1] / "config" / "layers"
CENSUS_MENU = LAYERS_DIR.parent / "census_menu.json"
CENSUS_CONFIG = Path(__file__).resolve().parent / "pipeline" / "census" / "config" / "census_datasets_config.json"
SHAPES = {"polygons": "MultiPolygon", "lines": "MultiLineString"}

# The census menu's fields, as (required, optional)
CATEGORY_FIELDS = ({"id", "label", "indicators"}, {"description"})
INDICATOR_FIELDS = ({"key", "dataset", "metric", "label"}, {"description", "calculationDescription", "off"})

# A metric key: a lowercase word with underscores, short enough to be a Postgres column name
KEY_PATTERN = re.compile(r"[a-z][a-z0-9_]{0,62}")

# Per layer file, the fields each kind of entry must have and may have, as (required, optional).
# A top-level layer has either subLayers or the file fields; a sub-layer always has the file fields
LAYER_FIELDS = ({"id", "name", "icon", "color"}, {"description", "metadata", "off", "subLayers"})
SUB_LAYER_FIELDS = ({"id", "name", "color"}, {"description", "metadata", "off"})
# Where a layer's data comes from; a sub-layer's metadata fields replace its parent's
METADATA_FIELDS = ({"citation", "period"}, {"note", "link"})
FIELDS = {
    "rasters": {
        "layer": (LAYER_FIELDS[0] | {"units", "opacity"}, LAYER_FIELDS[1]),
        "sub": (SUB_LAYER_FIELDS[0] | {"units", "opacity"}, SUB_LAYER_FIELDS[1]),
        "file": ({"file", "source", "nodata", "colormap"}, set()),
    },
    "polygons": {
        "layer": LAYER_FIELDS,
        "sub": SUB_LAYER_FIELDS,
        "file": ({"file", "source"}, {"keep", "rowFilter", "tileFlags", "popup"}),
    },
    "lines": {
        "layer": LAYER_FIELDS,
        "sub": SUB_LAYER_FIELDS,
        "file": ({"file", "source"}, {"keep", "rowFilter", "tileFlags", "popup"}),
    },
    # Point layers have no sub-layers; the popup's title column also names each point
    "points": {
        "layer": (LAYER_FIELDS[0], LAYER_FIELDS[1] - {"subLayers"}),
        "sub": SUB_LAYER_FIELDS,
        "file": ({"file", "source", "idFields", "popup"}, {"keep", "rowFilter"}),
    },
}

# The menus in menus.json and their groups, as (required, optional)
MENU_IDS = {"criticalInfrastructure", "locations", "hazards"}
MENU_FIELDS = ({"id", "title", "description", "items"}, {"popupTitle", "hideCheckboxes"})
GROUP_FIELDS = ({"group", "items"}, {"description", "icon", "color"})


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
    popup_columns: list  # the columns the popup names


@dataclass
class PointLayer:
    id: str  # points.layer_id
    file: str  # output file stem
    data_file: Path  # the GeoJSON the map and the loader read
    zips: list | None  # zips, outermost first, starting inside RAW_DIR; None for pins made from another layer
    inner: str | None  # shapefile inside the last zip
    markers_of: str | None  # the line or polygon layer whose shapes each get one pin
    keep: list | None  # columns to keep; None keeps all
    row_filter: str | None  # SQL condition for rows to keep; None keeps all
    id_fields: list  # the columns that together tell one point from another
    name_column: str  # the column that names each point
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
    from_zips = (
        source is not None and source.keys() == {"zips", "inner"} and source["zips"]
        and not (kind == "rasters" and len(source["zips"]) != 1)
    )
    pins = kind == "points" and source is not None and source.keys() == {"markersOf"}
    if source is not None and not (from_zips or pins):
        problems.append("source must be zips (exactly one for a raster) and the file inside the last, or markersOf for points")
    named = set(popup_columns(entry)) | set(entry.get("idFields", []))
    if "keep" in entry and (outside := named - set(entry["keep"])):
        problems.append(f"popup or id column not in keep: {', '.join(sorted(outside))}")
    if kind == "points" and "popup" in entry and "title" not in entry["popup"]:
        problems.append("popup has no title; its column names each point")
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
            if "metadata" in entry:
                metadata = {**(parent or {}).get("metadata", {}), **entry["metadata"]}
                problems += [f"{id_}: metadata {problem}" for problem in field_problems("metadata", metadata, *METADATA_FIELDS)]
    # Rasters, the shape layers and the points are written to different folders
    for kinds in (["rasters"], list(SHAPES), ["points"]):
        names = [entry["file"] for kind in kinds for _, entry, _ in live_files(files[kind])]
        problems += [f"{name}: file used twice" for name in repeats(names)]
    # Pins are made from a switched-on line or polygon layer with its own file, which must keep the columns the pins name
    shapes = {entry["id"]: entry for kind in SHAPES for _, entry, parent in live_files(files[kind]) if parent is None}
    for id_, entry, _ in live_files(files["points"]):
        source_id = entry.get("source", {}).get("markersOf")
        named = set(popup_columns(entry)) | set(entry.get("idFields", []))
        if source_id is not None and source_id not in shapes:
            problems.append(f"{id_}: markersOf {source_id} is not a switched-on line or polygon layer with its own file")
        elif source_id is not None and "keep" in shapes[source_id] and (outside := named - set(shapes[source_id]["keep"])):
            problems.append(f"{id_}: popup or id column not kept by {source_id}: {', '.join(sorted(outside))}")
    return problems


# Problems in menus.json: every switched-on top-level layer is listed exactly once, and only those
def menu_problems(menus, files):
    live = [entry["id"] for layers in files.values() for entry in layers if not entry.get("off")]
    listed, groups = [], []
    problems = [f"menu {id_}: id used twice" for id_ in repeats([menu.get("id") for menu in menus])]
    for menu in menus:
        problems += [f"menu {menu.get('id')}: {p}" for p in field_problems("menus", menu, *MENU_FIELDS)]
        if menu.get("id") not in MENU_IDS:
            problems.append(f"menu {menu.get('id')}: id must be one of {', '.join(sorted(MENU_IDS))}")
        for item in menu.get("items", []):
            if isinstance(item, str):
                listed.append(item)
                continue
            groups.append(item.get("group"))
            problems += [f"group {item.get('group')}: {p}" for p in field_problems("menus", item, *GROUP_FIELDS)]
            if not item.get("items"):
                problems.append(f"group {item.get('group')}: has no layers")
            listed += item.get("items", [])
    problems += [f"group {group}: label used twice" for group in repeats(groups)]
    problems += [f"{id_}: listed in the menus twice" for id_ in repeats(listed)]
    problems += [f"{id_}: listed in the menus, but no switched-on layer has that id" for id_ in sorted(set(listed) - set(live))]
    problems += [f"{id_}: in no menu" for id_ in sorted(set(live) - set(listed))]
    return problems


def stop_on(problems):
    for problem in problems:
        print(f"  FAIL {problem}")
    if problems:
        raise SystemExit(f"{len(problems)} problem(s), listed above")


# Every layer file, once they and menus.json all pass the static checks
def read_checked():
    files = {kind: json.loads((LAYERS_DIR / f"{kind}.json").read_text())["layers"] for kind in FIELDS}
    menus = json.loads((LAYERS_DIR / "menus.json").read_text())["menus"]
    stop_on(static_problems(files) + menu_problems(menus, files))
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
            popup_columns=popup_columns(entry),
        )
        for kind, shape in SHAPES.items()
        for id_, entry, parent in live_files(files[kind])
    ]


# Every switched-on point layer
def point_layers():
    return [
        PointLayer(
            id=id_,
            file=entry["file"],
            data_file=settings.POINT_DATA_DIR / f"{entry['file']}.geojson",
            zips=entry["source"].get("zips"),
            inner=entry["source"].get("inner"),
            markers_of=entry["source"].get("markersOf"),
            keep=entry.get("keep"),
            row_filter=entry.get("rowFilter"),
            id_fields=entry["idFields"],
            name_column=entry["popup"]["title"],
            popup_columns=popup_columns(entry),
        )
        for id_, entry, _ in live_files(read_checked()["points"])
    ]


# A point or raster metric's key from its layer id and metric, e.g. "stormsurge_inundation_category1_mean" ("_homelands" ends the Homelands copy's)
def layer_metric_key(layer_id: str, metric: str, homelands: bool) -> str:
    key = f"{re.sub(r'[^a-z0-9]+', '_', layer_id.lower()).strip('_')}_{metric.lower()}"
    return f"{key}_homelands" if homelands else key


# The entries of a census dataset list
def load_dataset_config(config_path) -> list:
    return json.loads(Path(config_path).expanduser().read_text())["datasets"]


# Each output file of a census dataset list as (entry, output): an entry's "outputs", else the entry itself named by its alias
def dataset_entries(dataset_configs: list) -> list:
    return [
        (config, output)
        for config in dataset_configs
        for output in config.get("outputs", [dict(config, name=config["alias"])])
    ]


# Every census dataset id, with whether it is a Hawaiian Homelands dataset
def census_datasets():
    return {output["name"]: output["hawaiian_homelands"] for _, output in dataset_entries(load_dataset_config(CENSUS_CONFIG))}


def census_categories():
    return json.loads(CENSUS_MENU.read_text())["categories"]


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
            if not KEY_PATTERN.fullmatch(str(indicator.get("key"))):
                problems.append(f"{name}: key must be lowercase letters, digits and _, starting with a letter, at most 63 long")
            if not indicator.get("off"):
                live.append((indicator.get("dataset"), indicator.get("metric")))
    problems += [f"{dataset} / {metric}: in the menu twice" for dataset, metric in repeats(live)]
    keys = [indicator.get("key") for category in categories for indicator in category.get("indicators", [])]
    problems += [f"key {key}: used twice" for key in repeats(keys)]
    return problems


# Every indicator, switched off or not, so one switched back on still works; stops on a broken menu
def census_indicators():
    stop_on(census_problems())
    return [indicator for category in census_categories() for indicator in category["indicators"]]
