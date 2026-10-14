"""
Reads each raster's value at every point and loads it, so a point filter can check
if a point is affected by a raster area

Run after ingest.load_postgis (rebuild.sh --full does this):
    python -m ingest.load_point_raster_values

A point gets a row only where the raster has a real value. The file's no-data
pixels, and points off the raster, get none.
"""

import asyncio
import os

import asyncpg
import rasterio

from app.routers.rasters import RASTER_CATALOG, RASTER_DIR

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://localhost/ccsvi")


async def load_raster(
    conn: asyncpg.Connection, raster_id: str, filename: str, points: list[asyncpg.Record]
) -> None:
    coords = [(p["lon"], p["lat"]) for p in points]
    with rasterio.open(RASTER_DIR / filename) as src:
        samples = list(src.sample(coords, indexes=1, masked=True))

    rows = [
        (point["id"], raster_id, float(sample[0]))
        for point, sample in zip(points, samples)
        if not sample.mask[0]
    ]
    await conn.executemany(
        "INSERT INTO point_raster_values (point_id, raster_id, value) VALUES ($1, $2, $3)", rows
    )
    print(f"  {raster_id}: {len(rows)} of {len(points)} points")


async def main() -> None:
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        await conn.execute("TRUNCATE point_raster_values")
        points = await conn.fetch("SELECT id, ST_X(geom) AS lon, ST_Y(geom) AS lat FROM points")
        print(f"Sampling {len(RASTER_CATALOG)} raster(s) at {len(points)} points")
        for raster_id, filename in RASTER_CATALOG.items():
            await load_raster(conn, raster_id, filename, points)
        print("Done.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
