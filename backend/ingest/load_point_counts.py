"""Counts each point layer's points per block group / Hawaiian Homeland area
and loads it as a metric.

Run after ingest.load_postgis, before the view refresh, in both rebuild.sh
modes:
    python -m ingest.load_point_counts

A new metric needs mv_columns.py updated by hand before it's filterable.
"""

import asyncio
import os

import asyncpg

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://localhost/ccsvi")

# (geographies.type value, hawaiian_homelands flag to write on the dataset)
TRACKS = [
    ("block_group", False),
    ("hawaiian_homeland", True),
]


def dataset_id_for(layer_id: str, homelands: bool) -> str:
    return f"{layer_id}_points_homelands" if homelands else f"{layer_id}_points"


# Fallback label for a layer with no config elsewhere
def label_for(layer_id: str) -> str:
    return f"{layer_id.replace('_', ' ').title()} (points)"


async def load_layer(conn: asyncpg.Connection, layer_id: str) -> None:
    for geo_type, homelands in TRACKS:
        dataset_id = dataset_id_for(layer_id, homelands)

        await conn.execute(
            """
            INSERT INTO datasets (id, label, hawaiian_homelands)
            VALUES ($1, $2, $3)
            ON CONFLICT (id) DO UPDATE SET
                label              = EXCLUDED.label,
                hawaiian_homelands = EXCLUDED.hawaiian_homelands
            """,
            dataset_id,
            label_for(layer_id),
            homelands,
        )

        # classification_mode/mv_column are set elsewhere
        await conn.execute(
            """
            INSERT INTO metrics (dataset_id, name, classification_mode, display_order,
                                  has_moe, has_percentage, has_moe_pp)
            VALUES ($1, 'Count', 'q', 0, false, false, false)
            ON CONFLICT (dataset_id, name) DO NOTHING
            """,
            dataset_id,
        )
        metric_id = await conn.fetchval(
            "SELECT id FROM metrics WHERE dataset_id = $1 AND name = 'Count'",
            dataset_id,
        )

        counts = await conn.fetch(
            """
            SELECT g.geoid, count(p.id) AS cnt
            FROM geographies g
            LEFT JOIN points p ON ST_Covers(g.geom, p.geom) AND p.layer_id = $1
            WHERE g.type = $2
            GROUP BY g.geoid
            """,
            layer_id,
            geo_type,
        )

        await conn.executemany(
            """
            INSERT INTO metric_values (geoid, metric_id, absolute)
            VALUES ($1, $2, $3)
            ON CONFLICT (geoid, metric_id) DO UPDATE SET absolute = EXCLUDED.absolute
            """,
            [(r["geoid"], metric_id, r["cnt"]) for r in counts],
        )

        print(f"  {dataset_id}: {len(counts)} geoids")


async def main() -> None:
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        layer_ids = [
            r["layer_id"]
            for r in await conn.fetch("SELECT DISTINCT layer_id FROM points ORDER BY 1")
        ]
        print(f"Found {len(layer_ids)} point layer(s): {', '.join(layer_ids)}")
        for layer_id in layer_ids:
            await load_layer(conn, layer_id)
        print("Done.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())