#!/usr/bin/env python3
"""Populate geographies.geom, points, and hazards.

rebuild.sh --full runs it. By hand, on the VM from the backend/ directory with DATABASE_URL set:
    python -m ingest.load_postgis
"""
import asyncio
import json
from pathlib import Path

import asyncpg

import settings
from registry import point_layers, shape_layers

REPO_ROOT = Path(__file__).parent.parent.parent
PUBLIC_DATA = REPO_ROOT / "public" / "data"


async def load_block_group_geoms(conn: asyncpg.Connection) -> int:
    path = PUBLIC_DATA / "2020_Census_Block_Groups_Stripped.geojson"
    with open(path) as f:
        fc = json.load(f)

    rows = [
        (json.dumps(feat["geometry"]), feat["properties"]["geoid20"])
        for feat in fc["features"]
        if feat.get("geometry") and feat["properties"].get("geoid20")
    ]
    await conn.executemany(
        "UPDATE geographies SET geom = ST_Multi(ST_GeomFromGeoJSON($1)) WHERE geoid = $2",
        rows,
    )
    return len(rows)


async def load_hawaiian_homeland_geoms(conn: asyncpg.Connection) -> int:
    """Update geographies.geom for Hawaiian Homeland geoids.

    Matches on GEOID (the 4-digit Home Land code) from the GeoJSON — must match the
    geographies.geoid values the census loader takes from the Homelands data file.
    """
    path = PUBLIC_DATA / "2024_Census_Hawaiian_Homelands_Stripped.geojson"
    with open(path) as f:
        fc = json.load(f)

    rows = [
        (json.dumps(feat["geometry"]), feat["properties"]["GEOID"])
        for feat in fc["features"]
        if feat.get("geometry") and feat["properties"].get("GEOID")
    ]
    await conn.executemany(
        "UPDATE geographies SET geom = ST_Multi(ST_GeomFromGeoJSON($1)) WHERE geoid = $2",
        rows,
    )
    # Report mismatches so we know if GEOID doesn't align with geographies.geoid
    null_count = await conn.fetchval(
        "SELECT count(*) FROM geographies WHERE type = 'hawaiian_homeland' AND geom IS NULL"
    )
    if null_count:
        print(f"  WARNING: {null_count} Hawaiian Homeland geographies still have NULL geom "
              "(GEOID may not match geographies.geoid)")
    return len(rows)


async def load_points(conn: asyncpg.Connection) -> int:
    await conn.execute("TRUNCATE points RESTART IDENTITY")
    total = 0

    for layer in point_layers():
        layer_id = layer.id
        with open(layer.data_file) as f:
            fc = json.load(f)

        rows = []
        for feat in fc["features"]:
            geom = feat.get("geometry")
            if not geom:
                continue
            props = feat.get("properties") or {}
            rows.append((layer_id, props.get(layer.name_column), json.dumps(props), json.dumps(geom)))

        await conn.executemany(
            "INSERT INTO points (layer_id, name, props, geom) "
            "VALUES ($1, $2, $3, ST_Centroid(ST_GeomFromGeoJSON($4)))",
            rows,
        )
        total += len(rows)
        print(f"    {layer_id}: {len(rows)} features")

    return total


async def load_hazards(conn: asyncpg.Connection) -> int:
    await conn.execute("TRUNCATE hazards RESTART IDENTITY")
    total = 0

    for layer in shape_layers():
        hazard_id, sub_id = layer.layer_id, layer.sub_id
        with open(layer.data_file) as f:
            fc = json.load(f)

        rows = []
        for feat in fc["features"]:
            geom = feat.get("geometry")
            if not geom:
                continue
            rows.append((hazard_id, sub_id, json.dumps(geom)))

        await conn.executemany(
            "INSERT INTO hazards (hazard_id, sub_id, geom) "
            "VALUES ($1, $2, ST_GeomFromGeoJSON($3))",
            rows,
        )
        total += len(rows)
        print(f"    {hazard_id}/{sub_id}: {len(rows)} features")

    return total


async def main() -> None:
    conn = await asyncpg.connect(settings.database_url())
    try:
        async with conn.transaction():
            print("Updating block group geometries...")
            n = await load_block_group_geoms(conn)
            print(f"  → {n} block groups")

            print("Updating Hawaiian Homeland geometries...")
            n = await load_hawaiian_homeland_geoms(conn)
            print(f"  → {n} homelands attempted")

            print("Populating points...")
            n = await load_points(conn)
            print(f"  → {n} total points")

            print("Populating hazards (this may take several minutes)...")
            n = await load_hazards(conn)
            print(f"  → {n} total hazard features")
        print("Done.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())