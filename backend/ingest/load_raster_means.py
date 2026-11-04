"""Averages each raster over every block group / Hawaiian Homeland area, and takes
its highest value there, and loads both as metrics.

Run after ingest.load_postgis, before the view refresh, in both rebuild.sh
modes:
    python -m ingest.load_raster_means

Matches the map popup (src/utils/zonalStats.ts): the mean skips the file's
no-data pixels, and an area with no data pixels gets no row, so it shows empty
rather than 0. A pixel counts when its centre is inside the area. The rasters
are NAD83 and the shapes WGS84; neither this nor the popup reprojects (under a
metre in Hawaii).
"""

import asyncio
import json

import asyncpg
import rasterio
from rasterio.mask import mask

import settings
from pipeline.check_layers import rasters

# (geographies.type value, hawaiian_homelands flag to write on the dataset)
AREA_TYPES = [
    ("block_group", False),
    ("hawaiian_homeland", True),
]

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
        dataset_id = dataset_id_for(raster.id, homelands)

        await conn.execute(
            """
            INSERT INTO datasets (id, label, hawaiian_homelands, source_type, layer_id)
            VALUES ($1, $2, $3, 'raster', $4)
            ON CONFLICT (id) DO UPDATE SET
                label              = EXCLUDED.label,
                hawaiian_homelands = EXCLUDED.hawaiian_homelands,
                source_type        = EXCLUDED.source_type,
                layer_id           = EXCLUDED.layer_id
            """,
            dataset_id,
            raster.label,
            homelands,
            raster.id,
        )

        with rasterio.open(settings.RASTER_DIR / raster.file) as src:
            stats = [(geoid, stats_over(src, geom)) for geoid, geom in shapes]

        # classification_mode/mv_column are set elsewhere
        for stat_index, name in enumerate(METRICS):
            await conn.execute(
                """
                INSERT INTO metrics (dataset_id, name, classification_mode, display_order,
                                      has_moe, has_percentage, has_moe_pp)
                VALUES ($1, $2, 'q', $3, false, false, false)
                ON CONFLICT (dataset_id, name) DO NOTHING
                """,
                dataset_id,
                name,
                stat_index,
            )
            metric_id = await conn.fetchval(
                "SELECT id FROM metrics WHERE dataset_id = $1 AND name = $2",
                dataset_id,
                name,
            )
            rows = [
                (geoid, metric_id, values[stat_index])
                for geoid, values in stats
                if values is not None
            ]

            await conn.executemany(
                """
                INSERT INTO metric_values (geoid, metric_id, absolute)
                VALUES ($1, $2, $3)
                ON CONFLICT (geoid, metric_id) DO UPDATE SET absolute = EXCLUDED.absolute
                """,
                rows,
            )

            print(f"  {dataset_id} / {name}: {len(rows)} of {len(shapes)} areas have data")


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
