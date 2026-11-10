"""
Works out which block group / Hawaiian Homeland area each point is in, so requests
and the point counts only look it up

Run after ingest.load_postgis (rebuild.sh --full does this):
    python -m ingest.load_point_areas
"""

import asyncio

import asyncpg

import settings


async def main() -> None:
    conn = await asyncpg.connect(settings.database_url())
    try:
        async with conn.transaction():
            await conn.execute("TRUNCATE point_geographies")
            status = await conn.execute(
                """
                INSERT INTO point_geographies (point_id, geoid)
                SELECT p.id, g.geoid
                FROM points p JOIN geographies g ON ST_Covers(g.geom, p.geom)
                """
            )
            pairs = int(status.split()[-1])
            if pairs == 0:
                raise SystemExit("No point is inside any area; run ingest.load_postgis first")
        print(f"Done. {pairs} point/area pairs.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
