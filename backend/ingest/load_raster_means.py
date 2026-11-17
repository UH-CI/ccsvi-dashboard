"""Averages each raster over every block group / Hawaiian Homeland area, and takes
its highest value there, and loads both as metrics.

Run after ingest.load_postgis, before the view refresh, in both rebuild.sh
modes:
    python -m ingest.load_raster_means

The mean skips the file's no-data pixels, and an area with no data pixels gets
no row, so it shows empty rather than 0. A pixel counts when its centre is
inside the area. The raster build stores the rasters in WGS84, like the
shapes, so nothing is converted here.
"""

import asyncio
import json

import asyncpg
import rasterio
from rasterio.mask import mask

import settings
from ingest.writer import AREA_TYPES, Dataset, Metric, Value, save_dataset
from registry import layer_metric_key, rasters

# The two values saved for every raster, in display order
METRICS = ("Mean", "Max")


# One dataset per raster: its id with "." as "_", then "_raster", e.g. "stormSurge_inundation_category1_raster"
def dataset_id_for(raster_id: str, homelands: bool) -> str:
    dataset_id = f"{raster_id.replace('.', '_')}_raster"
    return f"{dataset_id}_homelands" if homelands else dataset_id


# Mean and max of the data pixels inside the shape, or None if it has none or
# lies outside the raster (e.g. Niihau, which the storm surge files don't cover)
def stats_over(
    src: rasterio.DatasetReader, geometry: dict
) -> tuple[float, float] | None:
    try:
        data, _ = mask(src, [geometry], crop=True, filled=False)
    except ValueError as err:
        if "do not overlap" not in str(err):
            raise
        return None
    band = data[0]
    return None if band.count() == 0 else (float(band.mean()), float(band.max()))


async def load_track(
    conn: asyncpg.Connection, geo_type: str, homelands: bool
) -> None:
    shapes = [
        (r["geoid"], json.loads(r["geojson"]))
        for r in await conn.fetch(
            "SELECT geoid, ST_AsGeoJSON(geom) AS geojson FROM geographies"
            " WHERE type = $1 AND geom IS NOT NULL",
            geo_type,
        )
    ]

    for raster in rasters():
        dataset = Dataset(
            id=dataset_id_for(raster.id, homelands),
            label=raster.label,
            source_type="raster",
            hawaiian_homelands=homelands,
            layer_id=raster.id,
        )

        with rasterio.open(settings.RASTER_DIR / raster.file) as src:
            stats = [(geoid, stats_over(src, geom)) for geoid, geom in shapes]
        with_data = [(geoid, values) for geoid, values in stats if values is not None]

        async with conn.transaction():
            await save_dataset(
                conn,
                dataset,
                [
                    Metric(name, stat_index, key=layer_metric_key(raster.id, name, homelands))
                    for stat_index, name in enumerate(METRICS)
                ],
                [
                    Value(geoid, name, values[stat_index])
                    for stat_index, name in enumerate(METRICS)
                    for geoid, values in with_data
                ],
            )

        for name in METRICS:
            print(f"  {dataset.id} / {name}: {len(with_data)} of {len(shapes)} areas have data")


async def main() -> None:
    conn = await asyncpg.connect(settings.database_url())
    try:
        for geo_type, homelands in AREA_TYPES:
            await load_track(conn, geo_type, homelands)
        print("Done.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
