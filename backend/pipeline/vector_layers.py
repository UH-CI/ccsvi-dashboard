"""Vector layer stage of the data pipeline

Turns raw GIS files into cleaned GeoJSONs and map tiles.

  1. unzip the source to a temp folder
  2. ogr2ogr, one SpatiaLite query: keep the layer's rows (all, unless the entry has a filter)
     and columns (all, unless the entry lists some); reproject to WGS84; repair
     (ST_MakeValid); round to 5 decimals (~1 m) with ReducePrecision, which keeps shapes valid;
     keep only the layer's shape type (ST_CollectionExtract, dropping zero-width leftovers of
     repair) and drop rows left with no shape. Written as unsimplified GeoJSON
  3. tippecanoe: tiles from that GeoJSON (standard zoom range plus any extra settings the entry
     lists) into a staging folder, never over the live tiles
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
    columns: list = None  # columns to keep; None keeps all
    row_filter: str = None  # rows to keep, as a SQL condition, e.g. "zone = 1"; None keeps all rows
    shape: str = "MultiPolygon"  # output shape type, a key of EXTRACT; line layers set "MultiLineString"
    tile_flags: tuple = ()  # extra tippecanoe settings


SLR_EXPOSURE = ["hazards/Sea Level Rise Data.zip", "Sea Level Rise Data/slr_exposure_area_all.shp.zip"]
SLR_PASSIVE = ["hazards/Sea Level Rise Data.zip", "Sea Level Rise Data/slr_passive_fld_all.shp.zip"]
SLR_EROSION = ["hazards/Sea Level Rise Data.zip", "Sea Level Rise Data/slr_cstl_erosn_all.shp.zip"]
SLR_HIGHWAYS = ["hazards/Sea Level Rise Data.zip", "Sea Level Rise Data/slr_potent_fld_hwys_all.shp.zip"]
FIRE = ["hazards/Fire_Risk_Areas.zip"]
SOLAR = ["hazards/Solar_Insolation_Ranges.zip"]
BRIGHTFIELDS = ["hazards/Hawaii_Brightfields_Initiative_Data.zip"]
PCL_COLUMNS = ["objectid", "tmk_txt", "county", "island", "site___fac", "site_owner", "site_addre", "city",
               "zip_code", "pcsf_land", "historic_u", "current_de", "proposed_u", "urban_area", "distance_t",
               "epa_site_i", "doh_brownf", "heer_facil", "ehmp__y_n_", "potential", "heer_asses", "heer_respo",
               "nature_of", "nature_o_1", "st_areasha", "st_perimet"]
LANDFILL_COLUMNS = PCL_COLUMNS + ["heer_res_1", "landfill_s", "landfill_y", "landfill_o", "landfill_1"]
ROADS = "line/HI_All_Counties_Roads.zip"
ROAD_TILE_FLAGS = ("--drop-rate=0", "--no-feature-limit", "--no-tile-size-limit")

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
    # Zone 0 left out: removed by the team ("null location"), hidden on the map
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
    # "filtered" means trimmed columns, not fewer rows: all parcels are kept
    Layer("Prev_contaminated_land_filtered", BRIGHTFIELDS, "Hawaii_Brightfields_Initiative_Data.shp", columns=PCL_COLUMNS),
    Layer("Prev_contaminated_land_landfills", BRIGHTFIELDS, "Hawaii_Brightfields_Initiative_Data.shp", columns=LANDFILL_COLUMNS,
          row_filter="known_land = 'Y'"),
    Layer("filtered_road_Hawaii_island", [ROADS, "centerlines_haw.shp.zip"], "centerlines_haw.shp",
          shape="MultiLineString", tile_flags=ROAD_TILE_FLAGS),
    Layer("filtered_road_Kauai", [ROADS, "centerlines_kau.shp.zip"], "centerlines_kau.shp",
          shape="MultiLineString", tile_flags=ROAD_TILE_FLAGS),
    Layer("filtered_road_Maui", [ROADS, "roads_mau.shp.zip"], "roads_mau.shp",
          shape="MultiLineString", tile_flags=ROAD_TILE_FLAGS),
    Layer("filtered_road_Oahu", [ROADS, "streets_oah.shp.zip"], "streets_oah.shp",
          shape="MultiLineString", tile_flags=ROAD_TILE_FLAGS),
    Layer("filtered_sidewalks_and_paths", [ROADS, "sidewalks_and_paths_state.shp.zip"],
          "sidewalks_and_paths_state_existing.shp", shape="MultiLineString"),
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


# Reproject, repair, then round with ReducePrecision to keep shapes valid on the rounding grid;
# rows left with no shape of the layer's type (e.g. a "line" that was really a dot) are dropped
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


def make_tiles(layer, geojson, tiles):
    run(["tippecanoe", "-o", tiles, "-l", layer.name, *TILE_FLAGS, *layer.tile_flags, "--force",
         "--no-progress-indicator", geojson])


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
        filter_args = ["-where", layer.row_filter] if layer.row_filter else []
        info = json.loads(run(["ogrinfo", "-json", "-so", "-ro", "-al", *filter_args, source]))["layers"][0]
        source_count = info["featureCount"]
        process(layer, source, geojson, layer.columns or [f["name"] for f in info["fields"]])
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
