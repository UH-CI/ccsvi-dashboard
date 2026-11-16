"""Vector layer pipeline: turns original GIS downloads into the GeoJSON the database loads and the
map tiles and point files the website draws.

Each line and polygon layer is unzipped, cleaned (reprojected, repaired, rounded to about 1 m), tiled
and checked. Each point layer is unzipped and reprojected at full precision, or made as one pin per
shape of a line or polygon layer, and checked; points get no tiles. Files are built in a staging
folder and only moved live once every layer passes. Each run writes a report to reports/. The layers
are the ones in config/layers/lines.json, polygons.json and points.json.

python -m pipeline.vector_layers [--only <layer id>]
"""

import argparse
import json
import subprocess
import tempfile
import time
import zipfile
from pathlib import Path

import settings
from pipeline.build_tools import file_size, run, write_report
from pipeline.check_layers import source_problems
from registry import point_layers, shape_layers, stop_on

RAW_DIR = settings.RAW_DIR
GEOJSON_DIR = settings.HAZARD_GEOJSON_DIR
TILES_DIR = settings.HAZARD_TILES_DIR
STAGING_DIR = settings.DATA_DIR / "hazards_staging"
POINT_DIR = settings.POINT_DATA_DIR

# Coordinate decimals; 5 is about 1 m
DECIMALS = 5
# Tile settings for every layer
MAX_ZOOM = 14
TILE_FLAGS = ["--minimum-zoom=6", f"--maximum-zoom={MAX_ZOOM}", "--generate-ids", "--drop-densest-as-needed"]
# Projection in metres, for measuring length and area
METRIC_SRID = 32604
# SpatiaLite's number for each shape type
EXTRACT = {"MultiPolygon": 3, "MultiLineString": 2}
# min lon, min lat, max lon, max lat
HAWAII = (-161, 18, -154, 23)


# Every corner in nested GeoJSON coordinates
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


# Row count and total length or area, in metres
def measure(path, table, shape, row_filter=None):
    size = "ST_Length" if shape == "MultiLineString" else "ST_Area"
    sql = f'SELECT count(*) AS n, sum({size}(ST_Transform(geometry, {METRIC_SRID}))) AS size FROM "{table}"'
    if row_filter:
        sql += f" WHERE {row_filter}"
    result = json.loads(run(["ogrinfo", "-json", "-features", "-ro", "-dialect", "SQLite", "-sql", sql, path]))
    return result["layers"][0]["features"][0]["properties"]


# Unzips through any nested zips; returns the shapefile's path
def unzip(layer, tmp):
    path = RAW_DIR / layer.zips[0]
    for member in layer.zips[1:]:
        path = zipfile.ZipFile(path).extract(member, tmp)
    zipfile.ZipFile(path).extractall(tmp)
    return Path(tmp) / layer.inner


# Reproject, repair and round; drop rows left with no shape
def process(layer, source, out, columns):
    columns = ", ".join(f'"{c}"' for c in columns)
    shapes = f"ReducePrecision(ST_MakeValid(ST_Transform(geometry, 4326)), {10 ** -DECIMALS})"
    cleaned = f'SELECT {columns}, ST_CollectionExtract({shapes}, {EXTRACT[layer.shape]}) AS geometry FROM "{source.stem}"'
    if layer.row_filter:
        cleaned += f" WHERE {layer.row_filter}"
    sql = f"SELECT * FROM ({cleaned}) WHERE geometry IS NOT NULL"
    out.unlink(missing_ok=True)
    run(["ogr2ogr", "-f", "GeoJSON", out, source, "-dialect", "SQLite", "-sql", sql,
         "-a_srs", "EPSG:4326", "-nlt", layer.shape.upper(), "-nln", layer.file,
         "-lco", f"COORDINATE_PRECISION={DECIMALS}"])


# A file's first layer as ogrinfo describes it: feature count, columns, ...
def layer_info(path):
    return json.loads(run(["ogrinfo", "-json", "-so", "-ro", "-al", path]))["layers"][0]


def column_names(path):
    return [f["name"] for f in layer_info(path)["fields"]]


def check_bounds(points):
    lons = [p[0] for p in points]
    lats = [p[1] for p in points]
    box = (min(lons), min(lats), max(lons), max(lats))
    inside = HAWAII[0] <= box[0] and HAWAII[1] <= box[1] and box[2] <= HAWAII[2] and box[3] <= HAWAII[3]
    check(inside, "bounds: {:.2f}, {:.2f} to {:.2f}, {:.2f}".format(*box))


# One map pin inside each shape of a built line or polygon file, with all its columns
def make_markers(source_file, geojson, markers):
    columns = ", ".join(f'"{c}"' for c in column_names(geojson))
    sql = f'SELECT {columns}, ST_PointOnSurface(geometry) AS geometry FROM "{source_file}"'
    markers.unlink(missing_ok=True)
    run(["ogr2ogr", "-f", "GeoJSON", markers, geojson, "-dialect", "SQLite", "-sql", sql,
         "-a_srs", "EPSG:4326", "-nlt", "POINT", "-nln", markers.stem,
         "-lco", f"COORDINATE_PRECISION={DECIMALS}"])


def make_tiles(layer, geojson, tiles):
    run(["tippecanoe", "-o", tiles, "-l", layer.file, *TILE_FLAGS, *layer.tile_flags, "--force",
         "--no-progress-indicator", geojson])


# Notes shapes missing from the closest-zoom tiles. tippecanoe ids start at 1, in file order
def check_tiles(layer, geojson, tiles, count, row):
    decoded = json.loads(run(["tippecanoe-decode", "-z", MAX_ZOOM, "-Z", MAX_ZOOM, tiles]))
    ids = {f["id"] for tile in decoded["features"] for tile_layer in tile["features"] for f in tile_layer["features"]}
    missing = [n - 1 for n in range(1, count + 1) if n not in ids]
    if not missing:
        print(f"  ok   features in zoom {MAX_ZOOM} tiles: {count}")
        return
    size, unit = ("ST_Length", "m") if layer.shape == "MultiLineString" else ("ST_Area", "m²")
    sql = (f"SELECT max({size}(ST_Transform(geometry, {METRIC_SRID}))) AS largest FROM \"{layer.file}\" "
           f"WHERE rowid IN ({', '.join(map(str, missing))})")
    result = json.loads(run(["ogrinfo", "-json", "-features", "-ro", "-dialect", "SQLite", "-sql", sql, geojson]))
    largest = result["layers"][0]["features"][0]["properties"]["largest"]
    note = f"{len(missing)} of {count} shapes not in the zoom {MAX_ZOOM} map tiles (largest {largest:.1f} {unit})"
    row["notes"].append(note)
    print(f"  note {note}")


def largest_tile(tiles):
    stats = json.loads(run(["tippecanoe-decode", "--stats", tiles]))
    return max(stats, key=lambda tile: tile["bytes"])


# Fills in the report row and runs the checks that stop the run; returns the shape count
def check_outputs(layer, source, geojson, row):
    output = measure(geojson, layer.file, layer.shape)
    check(output["n"] > 0, f"shapes: {output['n']} (source {source['n']})")
    row["shapes"] = f"{source['n']:,} -> {output['n']:,} ({output['n'] / source['n']:.1%})"
    row["kept"] = f"{output['size'] / source['size']:.2%}"
    print(f"       shapes kept: {row['shapes']}; length or area kept: {row['kept']}")

    sql = f'SELECT count(*) AS n FROM "{layer.file}" WHERE NOT ST_IsValid(geometry)'
    result = json.loads(run(["ogrinfo", "-json", "-features", "-ro", "-dialect", "SQLite", "-sql", sql, geojson]))
    invalid = result["layers"][0]["features"][0]["properties"]["n"]
    check(invalid == 0, f"invalid shapes: {invalid}")

    features = json.loads(geojson.read_text())["features"]
    check_bounds([p for f in features for p in corners(f["geometry"]["coordinates"])])
    return output["n"]


# Builds one layer in the staging folder; returns the files to move live
def build(layer, row):
    print(layer.id)
    geojson = STAGING_DIR / f"{layer.file}.geojson"
    tiles = STAGING_DIR / f"{layer.file}.pmtiles"

    began = start = time.time()
    with tempfile.TemporaryDirectory() as tmp:
        source = unzip(layer, tmp)
        source_measure = measure(source, source.stem, layer.shape, layer.row_filter)
        source_columns = column_names(source)
        missing = sorted(set(layer.keep or []) - set(source_columns))
        check(not missing, f"kept columns missing from the source: {', '.join(missing) or 'none'}")
        columns = layer.keep or source_columns
        process(layer, source, geojson, columns)
    print(f"  processed: {file_size(geojson)} in {time.time() - start:.0f} s")

    start = time.time()
    make_tiles(layer, geojson, tiles)
    row["largest"] = f"{largest_tile(tiles)['bytes'] / 1e3:.0f} KB"
    row["map_files"] = file_size(tiles)
    print(f"  tiled: {row['map_files']} in {time.time() - start:.0f} s, largest tile {row['largest']}")

    count = check_outputs(layer, source_measure, geojson, row)
    check_tiles(layer, geojson, tiles, count, row)
    row["time"] = f"{time.time() - began:.0f} s"
    return [(geojson, GEOJSON_DIR / geojson.name), (tiles, TILES_DIR / tiles.name)]


# Reproject and keep rows/columns; drop rows with no point. Full precision: rounding would move some
# points near an area's edge into the next area
def process_points(layer, source, out, columns):
    columns = ", ".join(f'"{c}"' for c in columns)
    sql = f'SELECT {columns}, geometry FROM "{source.stem}" WHERE geometry IS NOT NULL'
    if layer.row_filter:
        sql += f" AND ({layer.row_filter})"
    out.unlink(missing_ok=True)
    run(["ogr2ogr", "-f", "GeoJSON", out, source, "-dialect", "SQLite", "-sql", sql,
         "-t_srs", "EPSG:4326", "-nlt", "POINT", "-nln", layer.file])


# Stops the run unless there are points, all in Hawaii, each with its own id values
def check_points(layer, out, source_count, row):
    features = json.loads(out.read_text())["features"]
    check(len(features) > 0, f"points: {len(features)} (source {source_count})")
    row["shapes"] = f"{source_count:,} -> {len(features):,}"
    check_bounds([f["geometry"]["coordinates"] for f in features])
    ids = [tuple(f["properties"].get(column) for column in layer.id_fields) for f in features]
    without = sum(None in id_ for id_ in ids)
    check(without == 0, f"points without {', '.join(layer.id_fields)}: {without}")
    shared = len(ids) - len(set(ids))
    check(shared == 0, f"points sharing {', '.join(layer.id_fields)} with another: {shared}")


# Builds one point layer in the staging folder, from its zip or as pins on a line or polygon layer
# (that layer's file from this run if it was built, else the live one); returns the file to move live
def build_points(layer, row, shape_files):
    print(layer.id)
    out = STAGING_DIR / f"{layer.file}.geojson"
    began = time.time()
    if layer.markers_of:
        source_file = shape_files[layer.markers_of]
        staged = STAGING_DIR / f"{source_file}.geojson"
        source = staged if staged.exists() else GEOJSON_DIR / staged.name
        make_markers(source_file, source, out)
        source_count = layer_info(source)["featureCount"]
    else:
        with tempfile.TemporaryDirectory() as tmp:
            source = unzip(layer, tmp)
            source_columns = column_names(source)
            missing = sorted(set(layer.keep or []) - set(source_columns))
            check(not missing, f"kept columns missing from the source: {', '.join(missing) or 'none'}")
            process_points(layer, source, out, layer.keep or source_columns)
            source_count = layer_info(source)["featureCount"]
    check_points(layer, out, source_count, row)
    row["map_files"] = file_size(out)
    row["time"] = f"{time.time() - began:.0f} s"
    return [(out, POINT_DIR / out.name)]


REPORT_COLUMNS = [("Layer", "layer"), ("Shapes in source -> kept", "shapes"), ("Length or area kept", "kept"),
                  ("Map files", "map_files"), ("Largest tile", "largest"), ("Time", "time")]
REPORT = ("Vector layers pipeline report", "vector_layers", REPORT_COLUMNS)


def main():
    shapes, points = shape_layers(), point_layers()
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--only", choices=[layer.id for layer in shapes + points], help="process just this layer")
    args = parser.parse_args()
    chosen_shapes = [layer for layer in shapes if args.only in (None, layer.id)]
    # Rebuilding a line or polygon layer also rebuilds the pins made from it
    chosen_points = [layer for layer in points if args.only in (None, layer.id, layer.markers_of)]
    stop_on(source_problems(chosen_shapes + [layer for layer in chosen_points if layer.zips]))
    shape_files = {layer.id: layer.file for layer in shapes}

    GEOJSON_DIR.mkdir(exist_ok=True)
    STAGING_DIR.mkdir(exist_ok=True)
    rows, moves = [], []
    try:
        for layer in chosen_shapes + chosen_points:
            row = {"layer": layer.id, "notes": []}
            rows.append(row)
            moves += build_points(layer, row, shape_files) if layer in chosen_points else build(layer, row)
    except (SystemExit, subprocess.CalledProcessError) as failure:
        row["notes"].append(f"{failure}; run stopped, nothing installed")
        write_report(*REPORT, rows)
        raise

    for staged, live in moves:
        staged.replace(live)
        print(f"Installed {live.name}")
    STAGING_DIR.rmdir()
    write_report(*REPORT, rows)


if __name__ == "__main__":
    main()
