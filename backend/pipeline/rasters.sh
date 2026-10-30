#!/usr/bin/env bash
# Build the raster files the tile server serves from the original downloads into a staging folder,
# then move them and empty the nginx tile cache. 
# Writes reports/rasters_<date>_<time>.txt
set -euo pipefail

RAW_DIR=/home/exouser/ccsvi-data/archived/raw_files/rasters
STAGING_DIR=/home/exouser/ccsvi-data/v05-2026/rasters_staging
RASTER_DIR=/home/exouser/ccsvi-data/v05-2026/rasters
REPORT_DIR=/home/exouser/ccsvi-data/v05-2026/reports
REPORT="$REPORT_DIR/rasters_$(date +%Y-%m-%d_%H%M%S).txt"
SLOSH="/vsizip/$RAW_DIR/SLOSH_Storm_Surge.zip/SLOSH_Storm_Surge/Hawaii_SLOSH_MOM_Inundation_11_2018"
LANDSLIDE="/vsizip/$RAW_DIR/Landslide Susceptability.zip/Landslide Susceptability"

RASTERS=(
    "Hawaii_Category1_MOM_Inundation_HighTide.cog.tif|$SLOSH/Hawaii_Category1_MOM_Inundation_HighTide.tif|255"
    "Hawaii_Category2_MOM_Inundation_HighTide.cog.tif|$SLOSH/Hawaii_Category2_MOM_Inundation_HighTide.tif|255"
    "Hawaii_Category3_MOM_Inundation_HighTide.cog.tif|$SLOSH/Hawaii_Category3_MOM_Inundation_HighTide.tif|255"
    "Hawaii_Category4_MOM_Inundation_HighTide.cog.tif|$SLOSH/Hawaii_Category4_MOM_Inundation_HighTide.tif|255"
    "lw_hi.cog.tif|$LANDSLIDE/lw_hi.tif|0"
)

file_size() { wc -c < "$1" | awk '{ if ($1 >= 1e6) printf "%.1f MB", $1 / 1e6; else printf "%.0f KB", $1 / 1e3 }'; }

# Report rows, tab-separated: raster, file size, time
rows=() notes=()
row() { rows+=("$(IFS=$'\t'; echo "$*")"); }

write_report() {
    mkdir -p "$REPORT_DIR"
    {
        echo "Rasters pipeline report"
        echo
        echo "---------- Notes ----------"
        if [ ${#notes[@]} -eq 0 ]; then echo "  none"; else printf '  %s\n' "${notes[@]}"; fi
        echo "---------------------------"
        echo
        printf 'Raster\tFile size\tTime\n%s\n' "$(printf '%s\n' "${rows[@]}")" | column -t -s $'\t'
    } > "$REPORT"
    echo "Report: $REPORT"
}

fail() {
    notes+=("$out: $1; run stopped, nothing installed")
    write_report
    echo "$out: $1" >&2
    exit 1
}

trap 'fail "a command failed on line $LINENO"' ERR

mkdir -p "$STAGING_DIR"

# Zoomed-out versions are rebuilt by averaging, ignoring any that came with the download
for entry in "${RASTERS[@]}"; do
    IFS='|' read -r out src nodata <<< "$entry"
    echo "Building $out"
    start=$(date +%s)
    gdal_translate -of COG -a_nodata "$nodata" -stats \
        -co COMPRESS=DEFLATE \
        -co OVERVIEWS=IGNORE_EXISTING \
        -co OVERVIEW_RESAMPLING=AVERAGE \
        "$src" "$STAGING_DIR/$out"

    size=$(file_size "$STAGING_DIR/$out")
    row "$out" "$size" "$(( $(date +%s) - start )) s"
    echo "Built $out: $size in $(( $(date +%s) - start )) s"
done
trap - ERR

for entry in "${RASTERS[@]}"; do
    IFS='|' read -r out src nodata <<< "$entry"
    mv "$STAGING_DIR/$out" "$RASTER_DIR/$out"
    rm -f "$RASTER_DIR/$out.aux.xml"
    echo "Installed $out"
done
rmdir "$STAGING_DIR"

echo "Emptying the nginx tile cache"
sudo find /var/cache/nginx/tiles -type f -delete
write_report
