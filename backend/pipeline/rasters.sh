#!/usr/bin/env bash
# Build the raster files the tile server serves from the original downloads into a staging folder,
# check them, then move them and empty the nginx tile cache.
set -euo pipefail

RAW_DIR=/home/exouser/ccsvi-data/archived/raw_files/rasters
STAGING_DIR=/home/exouser/ccsvi-data/v05-2026/rasters_staging
RASTER_DIR=/home/exouser/ccsvi-data/v05-2026/rasters
SLOSH="/vsizip/$RAW_DIR/SLOSH_Storm_Surge.zip/SLOSH_Storm_Surge/Hawaii_SLOSH_MOM_Inundation_11_2018"
LANDSLIDE="/vsizip/$RAW_DIR/Landslide Susceptability.zip/Landslide Susceptability"

RASTERS=(
    "Hawaii_Category1_MOM_Inundation_HighTide.cog.tif|$SLOSH/Hawaii_Category1_MOM_Inundation_HighTide.tif|255"
    "Hawaii_Category2_MOM_Inundation_HighTide.cog.tif|$SLOSH/Hawaii_Category2_MOM_Inundation_HighTide.tif|255"
    "Hawaii_Category3_MOM_Inundation_HighTide.cog.tif|$SLOSH/Hawaii_Category3_MOM_Inundation_HighTide.tif|255"
    "Hawaii_Category4_MOM_Inundation_HighTide.cog.tif|$SLOSH/Hawaii_Category4_MOM_Inundation_HighTide.tif|255"
    "lw_hi.cog.tif|$LANDSLIDE/lw_hi.tif|0"
)

mkdir -p "$STAGING_DIR"

# Zoomed-out versions are rebuilt by averaging, ignoring any that came with the download
for entry in "${RASTERS[@]}"; do
    IFS='|' read -r out src nodata <<< "$entry"
    echo "Building $out"
    gdal_translate -of COG -a_nodata "$nodata" -stats \
        -co COMPRESS=DEFLATE \
        -co OVERVIEWS=IGNORE_EXISTING \
        -co OVERVIEW_RESAMPLING=AVERAGE \
        "$src" "$STAGING_DIR/$out"
done

# Check every file before moving any, so a bad build never reaches the map
for entry in "${RASTERS[@]}"; do
    IFS='|' read -r out src nodata <<< "$entry"
    info=$(gdalinfo "$STAGING_DIR/$out")
    if ! grep -q "LAYOUT=COG" <<< "$info"; then
        echo "$out is not a COG" >&2; exit 1
    fi
    if ! grep -q "NoData Value=$nodata$" <<< "$info"; then
        echo "$out does not have $nodata as its no-data value" >&2; exit 1
    fi
    if grep -q "STATISTICS_VALID_PERCENT=0$" <<< "$info"; then
        echo "$out has no data" >&2; exit 1
    fi
    echo "Checked $out"
done

for entry in "${RASTERS[@]}"; do
    IFS='|' read -r out src nodata <<< "$entry"
    mv "$STAGING_DIR/$out" "$RASTER_DIR/$out"
    rm -f "$RASTER_DIR/$out.aux.xml"
    echo "Installed $out"
done
rmdir "$STAGING_DIR"

echo "Emptying the nginx tile cache"
sudo find /var/cache/nginx/tiles -type f -delete
