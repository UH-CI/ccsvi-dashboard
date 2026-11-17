"""Raster pipeline: turns the original raster downloads into the COG files the map tiles are drawn
from, and the loaders read values from.

Each raster is converted to longitude/latitude (WGS84, like every other layer) with the coordinate
correction files kept in config/proj, keeping every square's value and size. A raster whose coordinates
need a correction file that isn't there stops the run, naming it.

Each raster is built in a staging folder and only moved live once every one has built. Then the
nginx tile cache is emptied so the map draws the new files. Each run writes a report to reports/.

python -m pipeline.rasters [--only <raster id>]
"""

import argparse
import json
import subprocess
import time

import settings
from pipeline.build_tools import file_size, install_proj_grids, missing_proj_grids, run, write_report
from pipeline.check_layers import source_problems
from registry import rasters, stop_on

STAGING_DIR = settings.DATA_DIR / "rasters_staging"
REPORT = ("Rasters pipeline report", "rasters", [("Raster", "raster"), ("File size", "size"), ("Time", "time")])


# The original raster, read inside its zip
def source(raster):
    return f"/vsizip/{settings.RAW_DIR / raster.zips[0]}/{raster.inner}"


# Converted to longitude/latitude with as many squares as the original, each keeping one original value
# (nearest, never blended). Zoomed-out versions are rebuilt by averaging, ignoring any that came with the download
def build(raster, row):
    print(f"Building {raster.file}")
    start = time.time()
    staged = STAGING_DIR / raster.file
    warped = STAGING_DIR / f"{raster.file}.vrt"
    width, height = json.loads(run(["gdalinfo", "-json", source(raster)]))["size"]
    run(["gdalwarp", "-of", "VRT", "-overwrite", "-t_srs", "EPSG:4326", "-ts", width, height, "-r", "near",
         "-srcnodata", raster.nodata, "-dstnodata", raster.nodata, source(raster), warped])
    run(["gdal_translate", "-of", "COG", "-a_nodata", raster.nodata, "-stats",
         "-co", "COMPRESS=DEFLATE",
         "-co", "OVERVIEWS=IGNORE_EXISTING",
         "-co", "OVERVIEW_RESAMPLING=AVERAGE",
         warped, staged])
    warped.unlink()
    row["size"] = file_size(staged)
    row["time"] = f"{time.time() - start:.0f} s"
    print(f"Built {raster.file}: {row['size']} in {row['time']}")
    return staged


def main():
    found = rasters()
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--only", choices=[raster.id for raster in found], help="build just this raster")
    args = parser.parse_args()
    chosen = [raster for raster in found if args.only in (None, raster.id)]
    stop_on(source_problems(chosen))
    install_proj_grids()
    stop_on([f"{raster.id}: coordinate correction files missing: {grid}"
             for raster in chosen for grid in missing_proj_grids(source(raster))])

    STAGING_DIR.mkdir(exist_ok=True)
    rows, staged = [], []
    try:
        for raster in chosen:
            row = {"raster": raster.id, "notes": []}
            rows.append(row)
            staged.append((build(raster, row), raster))
    except subprocess.CalledProcessError as failure:
        row["notes"].append(f"{failure}; run stopped, nothing installed")
        write_report(*REPORT, rows)
        raise

    for path, raster in staged:
        path.replace(raster.data_file)
        (settings.RASTER_DIR / f"{raster.file}.aux.xml").unlink(missing_ok=True)
        print(f"Installed {raster.file}")
    STAGING_DIR.rmdir()

    print("Emptying the nginx tile cache")
    run(["sudo", "find", settings.TILE_CACHE_DIR, "-type", "f", "-delete"])
    write_report(*REPORT, rows)


if __name__ == "__main__":
    main()
