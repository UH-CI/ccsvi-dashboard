"""Vector layer stage of the data pipeline

Turns raw GIS files into cleaned GeoJSONs and map tiles.

  1. unzip the source to a temp folder
  2. ogr2ogr, one SpatiaLite query: keep the layer's columns; reproject to WGS84; repair
     (ST_MakeValid); round to 5 decimals (~1 m) with ReducePrecision, which keeps shapes valid;
     keep only the layer's shape type (ST_CollectionExtract, dropping zero-width leftovers of
     repair). Written as unsimplified GeoJSON
  3. tippecanoe: tiles from that GeoJSON into a staging folder, never over the live tiles
  4. checks: feature count, validity, shape type, location; stops on failure

python -m pipeline.vector_layers [--only <name>]
"""

import argparse
import json
import subprocess
import tempfile
import time
import zipfile
from dataclasses import dataclass
from pathlib import Path

RAW_DIR = Path("/home/exouser/ccsvi-data/archived/raw_files")
DATA_DIR = Path("/home/exouser/ccsvi-data/v05-2026")
GEOJSON_DIR = DATA_DIR / "hazards_geojson"
STAGING_DIR = DATA_DIR / "hazards_staging"

# Coordinate decimals in the processed GeoJSON
DECIMALS = 5
# Tile settings
TILE_FLAGS = ["--minimum-zoom=5", "--maximum-zoom=14"]
# ST_CollectionExtract's number for each output shape type
EXTRACT = {"MultiPolygon": 3, "MultiLineString": 2}
# min lon, min lat, max lon, max lat
HAWAII = (-161, 18, -154, 23)


@dataclass
class Layer:
    name: str      # output file name without extension; also the tile layer name the map reads
    zips: list     # zips from outermost in, the first relative to RAW_DIR
    inner: str     # shapefile inside the last zip
    columns: list  # columns to keep
    shape: str = "MultiPolygon"  # output shape type, a key of EXTRACT; line layers set "MultiLineString"


SLR_EXPOSURE = ["hazards/Sea Level Rise Data.zip", "Sea Level Rise Data/slr_exposure_area_all.shp.zip"]
SLR_EXPOSURE_COLUMNS = ["ID", "Shape_Leng", "Shape_Area"]

LAYERS = [
    Layer("filtered_slr_exposure_area_0pt5ft", SLR_EXPOSURE, "slr_exposure_area_0_pt_5_ft.shp", SLR_EXPOSURE_COLUMNS),
    Layer("filtered_slr_exposure_area_1pt1ft", SLR_EXPOSURE, "slr_exposure_area_1_pt_1_ft.shp", SLR_EXPOSURE_COLUMNS),
    Layer("filtered_slr_exposure_area_2pt0ft", SLR_EXPOSURE, "slr_exposure_area_2_pt_0_ft.shp", SLR_EXPOSURE_COLUMNS),
    Layer("filtered_slr_exposure_area_3pt2ft", SLR_EXPOSURE, "slr_exposure_area_3_pt_2_ft.shp", SLR_EXPOSURE_COLUMNS),
]


def run(cmd):
    return subprocess.run([str(c) for c in cmd], stdout=subprocess.PIPE, text=True, check=True).stdout


def megabytes(path):
    return f"{path.stat().st_size / 1e6:.1f} MB"


# Every corner in a GeoJSON coordinates array, however deeply nested
def corners(coords):
    if isinstance(coords[0], list):
        for c in coords:
            yield from corners(c)
    else:
        yield tuple(coords)


def check(ok, message):
    print(f"  {'ok  ' if ok else 'FAIL'} {message}")
    if not ok:
        raise SystemExit(f"Check failed: {message}")


# Extracts the layer's source through its nested zips into tmp; returns the shapefile's path
def unzip(layer, tmp):
    path = RAW_DIR / layer.zips[0]
    for member in layer.zips[1:]:
        path = zipfile.ZipFile(path).extract(member, tmp)
    zipfile.ZipFile(path).extractall(tmp)
    return Path(tmp) / layer.inner


# Reproject, repair, then round with ReducePrecision to keep shapes valid on the rounding grid
def process(layer, source, out):
    columns = ", ".join(f'"{c}"' for c in layer.columns)
    shapes = f"ReducePrecision(ST_MakeValid(ST_Transform(geometry, 4326)), {10 ** -DECIMALS})"
    sql = f'SELECT {columns}, ST_CollectionExtract({shapes}, {EXTRACT[layer.shape]}) AS geometry FROM "{source.stem}"'
    out.unlink(missing_ok=True)
    run(["ogr2ogr", "-f", "GeoJSON", out, source, "-dialect", "SQLite", "-sql", sql,
         "-a_srs", "EPSG:4326", "-nlt", layer.shape.upper(), "-nln", layer.name,
         "-lco", f"COORDINATE_PRECISION={DECIMALS}"])


def make_tiles(layer, geojson, tiles):
    run(["tippecanoe", "-o", tiles, "-l", layer.name, *TILE_FLAGS, "--force", "--no-progress-indicator", geojson])


def check_outputs(layer, source_count, geojson):
    features = json.loads(geojson.read_text())["features"]
    check(0 < len(features) <= source_count, f"features: {len(features)} (source {source_count})")

    sql = f'SELECT count(*) AS n FROM "{layer.name}" WHERE NOT ST_IsValid(geometry)'
    result = json.loads(run(["ogrinfo", "-json", "-features", "-ro", "-dialect", "SQLite", "-sql", sql, geojson]))
    invalid = result["layers"][0]["features"][0]["properties"]["n"]
    check(invalid == 0, f"invalid shapes: {invalid}")

    types = {f["geometry"]["type"] for f in features}
    check(types == {layer.shape}, f"shape types: {', '.join(sorted(types))}")

    points = [p for f in features for p in corners(f["geometry"]["coordinates"])]

    lons = [p[0] for p in points]
    lats = [p[1] for p in points]
    box = (min(lons), min(lats), max(lons), max(lats))
    inside = HAWAII[0] <= box[0] and HAWAII[1] <= box[1] and box[2] <= HAWAII[2] and box[3] <= HAWAII[3]
    check(inside, "bounds: {:.2f}, {:.2f} to {:.2f}, {:.2f}".format(*box))


def build(layer):
    print(layer.name)
    geojson = GEOJSON_DIR / f"{layer.name}.geojson"
    tiles = STAGING_DIR / f"{layer.name}.pmtiles"

    start = time.time()
    with tempfile.TemporaryDirectory() as tmp:
        source = unzip(layer, tmp)
        source_count = json.loads(run(["ogrinfo", "-json", "-so", "-ro", "-al", source]))["layers"][0]["featureCount"]
        process(layer, source, geojson)
    print(f"  processed: {megabytes(geojson)} in {time.time() - start:.0f} s")

    start = time.time()
    make_tiles(layer, geojson, tiles)
    print(f"  tiled: {megabytes(tiles)} in {time.time() - start:.0f} s")

    check_outputs(layer, source_count, geojson)


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--only", choices=[layer.name for layer in LAYERS], help="process just this layer")
    args = parser.parse_args()

    GEOJSON_DIR.mkdir(exist_ok=True)
    STAGING_DIR.mkdir(exist_ok=True)
    for layer in LAYERS:
        if args.only in (None, layer.name):
            build(layer)


if __name__ == "__main__":
    main()
