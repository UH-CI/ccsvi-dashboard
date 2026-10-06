"""
Calcs which block groups / Hawaiian Homeland areas and which points touch
each hazard layer

Run after ingest.load_postgis (rebuild.sh --full does this):
    python -m ingest.load_hazard_overlaps
"""

import asyncio
import os

import asyncpg

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://localhost/ccsvi")


def inserted(status: str) -> int:
    return int(status.split()[-1])


async def load_layer(conn: asyncpg.Connection, hazard_id: str, sub_id: str | None) -> None:
    areas = await conn.execute(
        """
        INSERT INTO geography_hazards (geoid, hazard_id, sub_id)
        SELECT DISTINCT g.geoid, h.hazard_id, h.sub_id
        FROM hazard_pieces h JOIN geographies g ON ST_Intersects(g.geom, h.geom)
        WHERE h.hazard_id = $1 AND h.sub_id IS NOT DISTINCT FROM $2
        """,
        hazard_id,
        sub_id,
    )
    points = await conn.execute(
        """
        INSERT INTO point_hazards (point_id, hazard_id, sub_id)
        SELECT DISTINCT p.id, h.hazard_id, h.sub_id
        FROM hazard_pieces h JOIN points p ON ST_Intersects(h.geom, p.geom)
        WHERE h.hazard_id = $1 AND h.sub_id IS NOT DISTINCT FROM $2
        """,
        hazard_id,
        sub_id,
    )
    label = f"{hazard_id}/{sub_id}" if sub_id else hazard_id
    print(f"  {label}: {inserted(areas)} areas, {inserted(points)} points")


async def main() -> None:
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        await conn.execute("TRUNCATE geography_hazards, point_hazards")
        # Island-sized shapes take minutes per overlap test; small pieces of them take
        # milliseconds and cover exactly the same ground. Dropped when the connection closes.
        await conn.execute(
            """
            CREATE TEMP TABLE hazard_pieces AS
            SELECT hazard_id, sub_id, ST_Subdivide(geom, 256) AS geom FROM hazards;
            CREATE INDEX ON hazard_pieces USING GIST (geom);
            CREATE INDEX ON hazard_pieces (hazard_id, sub_id);
            ANALYZE hazard_pieces;
            """
        )
        layers = await conn.fetch("SELECT DISTINCT hazard_id, sub_id FROM hazards ORDER BY 1, 2")
        print(f"Found {len(layers)} hazard layer(s)")
        for layer in layers:
            await load_layer(conn, layer["hazard_id"], layer["sub_id"])
        print("Done.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
