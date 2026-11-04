"""Reads the map layer files in config/layers/ and checks them. Every backend part that needs a
layer gets it from here, so they all read the same entry.

python -m pipeline.check_layers            every check, including the files on the VM
python -m pipeline.check_layers --static   only the checks that need no data files
"""

import argparse
import json
import zipfile
from dataclasses import dataclass
from pathlib import Path

import settings

LAYERS_DIR = Path(__file__).resolve().parents[2] / "config" / "layers"

# Fields each raster entry must have, and may have. A top-level layer has either subLayers or the file fields
RASTER_LAYER_FIELDS = {"id", "name", "icon", "color", "units", "opacity"}
RASTER_LAYER_OPTIONAL = {"description", "metadata", "off", "subLayers"}
RASTER_SUB_LAYER_FIELDS = {"id", "name", "color", "units", "opacity"}
RASTER_SUB_LAYER_OPTIONAL = {"description", "off"}
RASTER_FILE_FIELDS = {"file", "source", "nodata", "colormap"}


@dataclass
class Raster:
    id: str  # "<parent id>.<sub id>" for a sub-layer, as the map and the API name it
    label: str  # "<parent name>: <sub name>" for a sub-layer
    file: str  # COG file name in RASTER_DIR
    zip: Path
    inner: str  # path of the source file inside the zip
    nodata: int


def read(kind):
    return json.loads((LAYERS_DIR / f"{kind}.json").read_text())["layers"]


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


def field_problems(entry, required, optional):
    problems = []
    if missing := required - entry.keys():
        problems.append(f"missing {', '.join(sorted(missing))}")
    if unknown := entry.keys() - required - optional:
        problems.append(f"unknown field {', '.join(sorted(unknown))}")
    source = entry.get("source")
    if source is not None and (source.keys() != {"zips", "inner"} or len(source["zips"]) != 1):
        problems.append("source must be one zip and the file inside it")
    return problems


# Problems found in the file alone; switched-off entries only need a unique id
def static_problems(layers):
    entries = list(walk(layers))
    problems = [f"{id_}: id used twice" for id_ in repeats([id_ for id_, _, _ in entries])]
    live = [(id_, entry, parent) for id_, entry, parent in entries if not is_off(entry, parent)]
    for id_, entry, parent in live:
        if parent:
            required = RASTER_SUB_LAYER_FIELDS | RASTER_FILE_FIELDS
            optional = RASTER_SUB_LAYER_OPTIONAL
        else:
            required = RASTER_LAYER_FIELDS | (set() if "subLayers" in entry else RASTER_FILE_FIELDS)
            optional = RASTER_LAYER_OPTIONAL
        problems += [f"{id_}: {problem}" for problem in field_problems(entry, required, optional)]
    files = [entry["file"] for _, entry, _ in live if "file" in entry]
    problems += [f"{file}: file used twice" for file in repeats(files)]
    return problems


def stop_on(problems):
    for problem in problems:
        print(f"  FAIL {problem}")
    if problems:
        raise SystemExit(f"{len(problems)} problem(s) in the layer files in {LAYERS_DIR}")


# Every switched-on raster with a file, once the file passes the static checks
def rasters():
    layers = read("rasters")
    stop_on(static_problems(layers))
    return [
        Raster(
            id=id_,
            label=f"{parent['name']}: {entry['name']}" if parent else entry["name"],
            file=entry["file"],
            zip=settings.RAW_DIR / entry["source"]["zips"][0],
            inner=entry["source"]["inner"],
            nodata=entry["nodata"],
        )
        for id_, entry, parent in walk(layers)
        if "file" in entry and not is_off(entry, parent)
    ]


def source_problems(found):
    problems = []
    for raster in found:
        if not raster.zip.exists():
            problems.append(f"{raster.id}: no {raster.zip}")
        elif raster.inner not in zipfile.ZipFile(raster.zip).namelist():
            problems.append(f"{raster.id}: no {raster.inner} in {raster.zip.name}")
    return problems


def output_problems(found):
    return [
        f"{raster.id}: no {settings.RASTER_DIR / raster.file}"
        for raster in found
        if not (settings.RASTER_DIR / raster.file).exists()
    ]


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--static", action="store_true", help="skip the checks that need the data files")
    args = parser.parse_args()

    found = rasters()
    if not args.static:
        stop_on(source_problems(found) + output_problems(found))
    print(f"Layer files ok: {len(found)} rasters")


if __name__ == "__main__":
    main()
