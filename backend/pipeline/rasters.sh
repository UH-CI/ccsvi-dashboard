#!/usr/bin/env bash
# Build the raster files the tile server serves from the original downloads
# Then copy the files backend/app/routers/rasters.py and empty the nginx tile cache, so the map stops showing the old tiles.
set -euo pipefail

if [ $# -ne 1 ]; then
    echo "Usage: $(basename "$0") <output_dir>" >&2
    exit 1
fi
OUT_DIR="$1"
mkdir -p "$OUT_DIR"

RAW_DIR=/home/exouser/ccsvi-data/archived/raw_files/rasters
SLOSH="/vsizip/$RAW_DIR/SLOSH_Storm_Surge.zip/SLOSH_Storm_Surge/Hawaii_SLOSH_MOM_Inundation_11_2018"
LANDSLIDE="/vsizip/$RAW_DIR/Landslide Susceptability.zip/Landslide Susceptability"

RASTERS=(
    "Hawaii_Category1_MOM_Inundation_HighTide.cog.tif|$SLOSH/Hawaii_Category1_MOM_Inundation_HighTide.tif|255"
    "Hawaii_Category2_MOM_Inundation_HighTide.cog.tif|$SLOSH/Hawaii_Category2_MOM_Inundation_HighTide.tif|255"
    "Hawaii_Category3_MOM_Inundation_HighTide.cog.tif|$SLOSH/Hawaii_Category3_MOM_Inundation_HighTide.tif|255"
    "Hawaii_Category4_MOM_Inundation_HighTide.cog.tif|$SLOSH/Hawaii_Category4_MOM_Inundation_HighTide.tif|255"
    "lw_hi.cog.tif|$LANDSLIDE/lw_hi.tif|0"
)

# Zoomed-out versions are rebuilt by averaging, ignoring any that came with the download
for entry in "${RASTERS[@]}"; do
    IFS='|' read -r out src nodata <<< "$entry"
    echo "Building $out"
    gdal_translate -of COG -a_nodata "$nodata" -stats \
        -co COMPRESS=DEFLATE \
        -co OVERVIEWS=IGNORE_EXISTING \
        -co OVERVIEW_RESAMPLING=AVERAGE \
        "$src" "$OUT_DIR/$out"
done
