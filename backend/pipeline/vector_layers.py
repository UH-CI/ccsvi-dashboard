"""Vector layer pipeline: turns original GIS downloads into the GeoJSON the database loads and the
map tiles the website draws.

Each layer is unzipped, cleaned (reprojected, repaired, rounded to about 1 m), tiled and checked.
Files are built in a staging folder and only moved live once every layer passes. Each run writes
a report to reports/.

python -m pipeline.vector_layers [--only <name>]
"""

import argparse
import json
import subprocess
import tempfile
import time
import zipfile
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

RAW_DIR = Path("/home/exouser/ccsvi-data/archived/raw_files")
DATA_DIR = Path("/home/exouser/ccsvi-data/v05-2026")
GEOJSON_DIR = DATA_DIR / "hazards_geojson"
TILES_DIR = DATA_DIR / "hazards"
STAGING_DIR = DATA_DIR / "hazards_staging"
POINT_DIR = DATA_DIR / "point_data"
REPORT_DIR = DATA_DIR / "reports"

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


@dataclass
class Layer:
    name: str      # output file name; also the name the map looks up
    zips: list     # zips, outermost first, starting inside RAW_DIR
    inner: str     # shapefile inside the last zip
    columns: list = None  # columns to keep; None keeps all
    row_filter: str = None  # SQL condition for rows to keep; None keeps all
    shape: str = "MultiPolygon"  # "MultiLineString" for lines
    tile_flags: tuple = ()  # extra tippecanoe settings
    markers: bool = False  # also make one map pin per shape


SLR_EXPOSURE = ["polygon/hazards/Sea Level Rise Data.zip", "Sea Level Rise Data/slr_exposure_area_all.shp.zip"]
SLR_PASSIVE = ["polygon/hazards/Sea Level Rise Data.zip", "Sea Level Rise Data/slr_passive_fld_all.shp.zip"]
SLR_EROSION = ["polygon/hazards/Sea Level Rise Data.zip", "Sea Level Rise Data/slr_cstl_erosn_all.shp.zip"]
SLR_HIGHWAYS = ["polygon/hazards/Sea Level Rise Data.zip", "Sea Level Rise Data/slr_potent_fld_hwys_all.shp.zip"]
FIRE = ["polygon/hazards/Fire_Risk_Areas.zip"]
SOLAR = ["polygon/hazards/Solar_Insolation_Ranges.zip"]
BRIGHTFIELDS = ["polygon/hazards/Hawaii_Brightfields_Initiative_Data.zip"]
PCL_COLUMNS = ["objectid", "tmk_txt", "county", "island", "site___fac", "site_owner", "site_addre", "city",
               "zip_code", "pcsf_land", "historic_u", "current_de", "proposed_u", "urban_area", "distance_t",
               "epa_site_i", "doh_brownf", "heer_facil", "ehmp__y_n_", "potential", "heer_asses", "heer_respo",
               "nature_of", "nature_o_1", "st_areasha", "st_perimet"]
LANDFILL_COLUMNS = PCL_COLUMNS + ["heer_res_1", "landfill_s", "landfill_y", "landfill_o", "landfill_1"]
ROADS = "line/HI_All_Counties_Roads.zip"
FLOOD = ["polygon/hazards/Flood_Hazard_Areas_(DFIRM)_-_Statewide.zip"]
FLOOD_COLUMNS = ["fld_zone", "sfha_tf", "static_bfe", "depth"]
AIRPORT_COLUMNS = ["objectid", "airport_co", "airport_na"]
HARBOR_COLUMNS = ["objectid", "harbor_nam", "berth_leng", "yard_area", "shed_area", "channel_de", "turn_basin"]

LAYERS = [
    Layer("filtered_slr_exposure_area_0pt5ft", SLR_EXPOSURE, "slr_exposure_area_0_pt_5_ft.shp"),
    Layer("filtered_slr_exposure_area_1pt1ft", SLR_EXPOSURE, "slr_exposure_area_1_pt_1_ft.shp"),
    Layer("filtered_slr_exposure_area_2pt0ft", SLR_EXPOSURE, "slr_exposure_area_2_pt_0_ft.shp"),
    Layer("filtered_slr_exposure_area_3pt2ft", SLR_EXPOSURE, "slr_exposure_area_3_pt_2_ft.shp"),
    Layer("filtered_slr_passive_fld_0pt5ft", SLR_PASSIVE, "slr_passive_fld_0_pt_5_ft.shp"),
    Layer("filtered_slr_passive_fld_1pt1ft", SLR_PASSIVE, "slr_passive_fld_1_pt_1_ft.shp"),
    Layer("filtered_slr_passive_fld_2pt0ft", SLR_PASSIVE, "slr_passive_fld_2_pt_0_ft.shp"),
    Layer("filtered_slr_passive_fld_3pt2ft", SLR_PASSIVE, "slr_passive_fld_3_pt_2_ft.shp"),
    Layer("filtered_slr_cstl_erosn_0pt5ft", SLR_EROSION, "slr_cstl_erosn_0_pt_5_ft.shp"),
    Layer("filtered_slr_cstl_erosn_1pt1ft", SLR_EROSION, "slr_cstl_erosn_1_pt_1_ft.shp"),
    Layer("filtered_slr_cstl_erosn_2pt0ft", SLR_EROSION, "slr_cstl_erosn_2_pt_0_ft.shp"),
    Layer("filtered_slr_cstl_erosn_3pt2ft", SLR_EROSION, "slr_cstl_erosn_3_pt_2_ft.shp"),
    Layer("filtered_slr_potent_fld_hwys_0pt5ft", SLR_HIGHWAYS, "slr_potent_fld_hwys_0_pt_5_ft.shp", shape="MultiLineString"),
    Layer("filtered_slr_potent_fld_hwys_1pt1ft", SLR_HIGHWAYS, "slr_potent_fld_hwys_1_pt_1_ft.shp", shape="MultiLineString"),
    Layer("filtered_slr_potent_fld_hwys_2pt0ft", SLR_HIGHWAYS, "slr_potent_fld_hwys_2_pt_0_ft.shp", shape="MultiLineString"),
    Layer("filtered_slr_potent_fld_hwys_3pt2ft", SLR_HIGHWAYS, "slr_potent_fld_hwys_3_pt_2_ft.shp", shape="MultiLineString"),
    Layer("Fire_zone_1", FIRE, "Fire_Risk_Areas.shp", row_filter="zone = 1"),
    Layer("Fire_zone_2", FIRE, "Fire_Risk_Areas.shp", row_filter="zone = 2"),
    Layer("Fire_zone_3", FIRE, "Fire_Risk_Areas.shp", row_filter="zone = 3"),
    Layer("Fire_zone_4", FIRE, "Fire_Risk_Areas.shp", row_filter="zone = 4"),
    Layer("Fire_zone_5", FIRE, "Fire_Risk_Areas.shp", row_filter="zone = 5"),
    Layer("Fire_zone_6", FIRE, "Fire_Risk_Areas.shp", row_filter="zone = 6"),
    Layer("Solar_Insolation_200-250", SOLAR, "Solar_Insolation_Ranges.shp", row_filter="solar_cal = '200-250'"),
    Layer("Solar_Insolation_250-300", SOLAR, "Solar_Insolation_Ranges.shp", row_filter="solar_cal = '250-300'"),
    Layer("Solar_Insolation_300-350", SOLAR, "Solar_Insolation_Ranges.shp", row_filter="solar_cal = '300-350'"),
    Layer("Solar_Insolation_350-400", SOLAR, "Solar_Insolation_Ranges.shp", row_filter="solar_cal = '350-400'"),
    Layer("Solar_Insolation_400-450", SOLAR, "Solar_Insolation_Ranges.shp", row_filter="solar_cal = '400-450'"),
    Layer("Solar_Insolation_450-500", SOLAR, "Solar_Insolation_Ranges.shp", row_filter="solar_cal = '450-500'"),
    Layer("Solar_Insolation_500-550", SOLAR, "Solar_Insolation_Ranges.shp", row_filter="solar_cal = '500-550'"),
    Layer("Solar_Insolation_550-600", SOLAR, "Solar_Insolation_Ranges.shp", row_filter="solar_cal = '550-600'"),
    Layer("Solar_Insolation_600-650", SOLAR, "Solar_Insolation_Ranges.shp", row_filter="solar_cal = '600-650'"),
    # "filtered" means fewer columns, not fewer rows
    Layer("Prev_contaminated_land_filtered", BRIGHTFIELDS, "Hawaii_Brightfields_Initiative_Data.shp", columns=PCL_COLUMNS),
    Layer("Prev_contaminated_land_landfills", BRIGHTFIELDS, "Hawaii_Brightfields_Initiative_Data.shp", columns=LANDFILL_COLUMNS,
          row_filter="known_land = 'Y'"),
    Layer("filtered_road_Hawaii_island", [ROADS, "centerlines_haw.shp.zip"], "centerlines_haw.shp", shape="MultiLineString"),
    Layer("filtered_road_Kauai", [ROADS, "centerlines_kau.shp.zip"], "centerlines_kau.shp", shape="MultiLineString"),
    Layer("filtered_road_Maui", [ROADS, "roads_mau.shp.zip"], "roads_mau.shp", shape="MultiLineString"),
    Layer("filtered_road_Oahu", [ROADS, "streets_oah.shp.zip"], "streets_oah.shp", shape="MultiLineString"),
    Layer("filtered_sidewalks_and_paths", [ROADS, "sidewalks_and_paths_state.shp.zip"],
          "sidewalks_and_paths_state_existing.shp", shape="MultiLineString"),
    # All rows of each zone, including those with no flood height (static_bfe -9999)
    Layer("Flood_Hazard_VE", FLOOD, "Flood_Hazard_Areas_(DFIRM)_-_Statewide.shp", columns=FLOOD_COLUMNS, row_filter="fld_zone = 'VE'"),
    Layer("Flood_Hazard_AE", FLOOD, "Flood_Hazard_Areas_(DFIRM)_-_Statewide.shp", columns=FLOOD_COLUMNS, row_filter="fld_zone = 'AE'"),
    Layer("Flood_Hazard_AO", FLOOD, "Flood_Hazard_Areas_(DFIRM)_-_Statewide.shp", columns=FLOOD_COLUMNS, row_filter="fld_zone = 'AO'"),
    Layer("Flood_Hazard_AH", FLOOD, "Flood_Hazard_Areas_(DFIRM)_-_Statewide.shp", columns=FLOOD_COLUMNS, row_filter="fld_zone = 'AH'"),
    Layer("Airports", ["polygon/Airports.zip"], "Airports.shp", columns=AIRPORT_COLUMNS, markers=True),
    Layer("Commercial_Harbors", ["polygon/Commercial_Harbors.zip"], "Commercial_Harbors.shp",
          columns=HARBOR_COLUMNS, markers=True),
]


def run(cmd):
    return subprocess.run([str(c) for c in cmd], stdout=subprocess.PIPE, text=True, check=True).stdout


# Total size, in KB under 1 MB
def file_size(*paths):
    size = sum(path.stat().st_size for path in paths)
    return f"{size / 1e6:.1f} MB" if size >= 1e6 else f"{size / 1e3:.0f} KB"


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
         "-a_srs", "EPSG:4326", "-nlt", layer.shape.upper(), "-nln", layer.name,
         "-lco", f"COORDINATE_PRECISION={DECIMALS}"])


# One map pin inside each shape
def make_markers(layer, geojson, markers, columns):
    columns = ", ".join(f'"{c}"' for c in columns)
    sql = f'SELECT {columns}, ST_PointOnSurface(geometry) AS geometry FROM "{layer.name}"'
    markers.unlink(missing_ok=True)
    run(["ogr2ogr", "-f", "GeoJSON", markers, geojson, "-dialect", "SQLite", "-sql", sql,
         "-a_srs", "EPSG:4326", "-nlt", "POINT", "-nln", markers.stem,
         "-lco", f"COORDINATE_PRECISION={DECIMALS}"])


def make_tiles(layer, geojson, tiles):
    run(["tippecanoe", "-o", tiles, "-l", layer.name, *TILE_FLAGS, *layer.tile_flags, "--force",
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
    sql = (f"SELECT max({size}(ST_Transform(geometry, {METRIC_SRID}))) AS largest FROM \"{layer.name}\" "
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
    output = measure(geojson, layer.name, layer.shape)
    check(output["n"] > 0, f"shapes: {output['n']} (source {source['n']})")
    row["shapes"] = f"{source['n']:,} -> {output['n']:,} ({output['n'] / source['n']:.1%})"
    row["kept"] = f"{output['size'] / source['size']:.2%}"
    print(f"       shapes kept: {row['shapes']}; length or area kept: {row['kept']}")

    sql = f'SELECT count(*) AS n FROM "{layer.name}" WHERE NOT ST_IsValid(geometry)'
    result = json.loads(run(["ogrinfo", "-json", "-features", "-ro", "-dialect", "SQLite", "-sql", sql, geojson]))
    invalid = result["layers"][0]["features"][0]["properties"]["n"]
    check(invalid == 0, f"invalid shapes: {invalid}")

    features = json.loads(geojson.read_text())["features"]
    points = [p for f in features for p in corners(f["geometry"]["coordinates"])]

    lons = [p[0] for p in points]
    lats = [p[1] for p in points]
    box = (min(lons), min(lats), max(lons), max(lats))
    inside = HAWAII[0] <= box[0] and HAWAII[1] <= box[1] and box[2] <= HAWAII[2] and box[3] <= HAWAII[3]
    check(inside, "bounds: {:.2f}, {:.2f} to {:.2f}, {:.2f}".format(*box))
    return output["n"]


# Builds one layer in the staging folder; returns the files to move live
def build(layer, row):
    print(layer.name)
    geojson = STAGING_DIR / f"{layer.name}.geojson"
    tiles = STAGING_DIR / f"{layer.name}.pmtiles"

    began = start = time.time()
    with tempfile.TemporaryDirectory() as tmp:
        source = unzip(layer, tmp)
        source_measure = measure(source, source.stem, layer.shape, layer.row_filter)
        info = json.loads(run(["ogrinfo", "-json", "-so", "-ro", "-al", source]))["layers"][0]
        columns = layer.columns or [f["name"] for f in info["fields"]]
        process(layer, source, geojson, columns)
    print(f"  processed: {file_size(geojson)} in {time.time() - start:.0f} s")

    start = time.time()
    make_tiles(layer, geojson, tiles)
    row["largest"] = f"{largest_tile(tiles)['bytes'] / 1e3:.0f} KB"
    row["map_files"] = file_size(tiles)
    print(f"  tiled: {row['map_files']} in {time.time() - start:.0f} s, largest tile {row['largest']}")

    count = check_outputs(layer, source_measure, geojson, row)
    check_tiles(layer, geojson, tiles, count, row)
    moves = [(geojson, GEOJSON_DIR / geojson.name), (tiles, TILES_DIR / tiles.name)]

    if layer.markers:
        markers = STAGING_DIR / f"{layer.name}_points.geojson"
        make_markers(layer, geojson, markers, columns)
        row["map_files"] = file_size(tiles, markers)
        moves.append((markers, POINT_DIR / markers.name))

    row["time"] = f"{time.time() - began:.0f} s"
    return moves


REPORT_COLUMNS = [("Layer", "layer"), ("Shapes in source -> kept", "shapes"), ("Length or area kept", "kept"),
                  ("Map files", "map_files"), ("Largest tile", "largest"), ("Time", "time")]


def write_report(rows):
    notes = [f"  {row['layer']}: {note}" for row in rows for note in row["notes"]]
    table = [[heading for heading, _ in REPORT_COLUMNS]]
    table += [[row.get(key, "-") for _, key in REPORT_COLUMNS] for row in rows]
    widths = [max(len(line[i]) for line in table) for i in range(len(REPORT_COLUMNS))]
    lines = [
        "Vector layers pipeline report",
        "",
        "---------- Notes ----------",
        *(notes or ["  none"]),
        "---------------------------",
        "",
        *("  ".join(cell.ljust(width) for cell, width in zip(line, widths)).rstrip() for line in table),
    ]
    REPORT_DIR.mkdir(exist_ok=True)
    path = REPORT_DIR / f"vector_layers_{datetime.now():%Y-%m-%d_%H%M%S}.txt"
    path.write_text("\n".join(lines) + "\n")
    print(f"Report: {path}")


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--only", choices=[layer.name for layer in LAYERS], help="process just this layer")
    args = parser.parse_args()

    GEOJSON_DIR.mkdir(exist_ok=True)
    STAGING_DIR.mkdir(exist_ok=True)
    rows, moves = [], []
    try:
        for layer in LAYERS:
            if args.only in (None, layer.name):
                row = {"layer": layer.name, "notes": []}
                rows.append(row)
                moves += build(layer, row)
    except (SystemExit, subprocess.CalledProcessError) as failure:
        row["notes"].append(f"{failure}; run stopped, nothing installed")
        write_report(rows)
        raise

    for staged, live in moves:
        staged.replace(live)
        print(f"Installed {live.name}")
    STAGING_DIR.rmdir()
    write_report(rows)


if __name__ == "__main__":
    main()
