"""Counts each point layer's points per block group / Hawaiian Homeland area
and loads it as a metric.

Run after ingest.load_point_areas, before the view refresh, in both rebuild.sh
modes:
    python -m ingest.load_point_counts

Every point layer's count gets its filter column automatically (db/mv_columns.py).
"""

import asyncio

import asyncpg

import settings
from ingest.writer import AREA_TYPES, Dataset, Metric, Value, save_dataset


def dataset_id_for(layer_id: str, homelands: bool) -> str:
    return f"{layer_id}_points_homelands" if homelands else f"{layer_id}_points"


# Fallback label for a layer with no config elsewhere
def label_for(layer_id: str) -> str:
    return f"{layer_id.replace('_', ' ').title()} (points)"


async def load_layer(conn: asyncpg.Connection, layer_id: str) -> None:
    for geo_type, homelands in AREA_TYPES:
        dataset = Dataset(
            id=dataset_id_for(layer_id, homelands),
            label=label_for(layer_id),
            source_type="point",
            hawaiian_homelands=homelands,
            layer_id=layer_id,
        )

        counts = await conn.fetch(
            """
            SELECT g.geoid, count(p.id) AS cnt
            FROM geographies g
            LEFT JOIN point_geographies pg ON pg.geoid = g.geoid
            LEFT JOIN points p ON p.id = pg.point_id AND p.layer_id = $1
            WHERE g.type = $2
            GROUP BY g.geoid
            """,
            layer_id,
            geo_type,
        )

        async with conn.transaction():
            await save_dataset(
                conn,
                dataset,
                [Metric("Count", 0)],
                [Value(r["geoid"], "Count", r["cnt"]) for r in counts],
            )

        print(f"  {dataset.id}: {len(counts)} geoids")


async def main() -> None:
    conn = await asyncpg.connect(settings.database_url())
    try:
        layer_ids = [
            r["layer_id"]
            for r in await conn.fetch("SELECT DISTINCT layer_id FROM points ORDER BY 1")
        ]
        if not layer_ids:
            raise SystemExit("No points in the database; run ingest.load_postgis first")
        if not await conn.fetchval("SELECT EXISTS (SELECT 1 FROM point_geographies)"):
            raise SystemExit("No point has an area yet; run ingest.load_point_areas first")
        print(f"Found {len(layer_ids)} point layer(s): {', '.join(layer_ids)}")
        for layer_id in layer_ids:
            await load_layer(conn, layer_id)
        print("Done.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())