"""
Reads each raster's value at every point and loads it, so a point filter can check
if a point is affected by a raster area

Run after ingest.load_postgis, in both rebuild.sh modes, so a raster built since the last full rebuild is included:
    python -m ingest.load_point_raster_values

A point gets a row only where the raster has a real value. The file's no-data
pixels, and points off the raster, get none.
"""

import asyncio

import asyncpg
import rasterio

import settings
from pipeline.check_layers import Raster, rasters


async def load_raster(conn: asyncpg.Connection, raster: Raster, points: list[asyncpg.Record]) -> None:
    coords = [(p["lon"], p["lat"]) for p in points]
    with rasterio.open(settings.RASTER_DIR / raster.file) as src:
        samples = list(src.sample(coords, indexes=1, masked=True))

    rows = [
        (point["id"], raster.id, float(sample[0]))
        for point, sample in zip(points, samples)
        if not sample.mask[0]
    ]
    await conn.executemany(
        "INSERT INTO point_raster_values (point_id, raster_id, value) VALUES ($1, $2, $3)", rows
    )
    print(f"  {raster.id}: {len(rows)} of {len(points)} points")


async def main() -> None:
    found = rasters()
    conn = await asyncpg.connect(settings.database_url())
    try:
        async with conn.transaction():
            await conn.execute("TRUNCATE point_raster_values")
            points = await conn.fetch("SELECT id, ST_X(geom) AS lon, ST_Y(geom) AS lat FROM points")
            if not points:
                raise SystemExit("No points in the database; run ingest.load_postgis first")
            print(f"Sampling {len(found)} raster(s) at {len(points)} points")
            for raster in found:
                await load_raster(conn, raster, points)
        print("Done.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
