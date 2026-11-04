#!/usr/bin/env python3
"""Populate geographies.geom, points, and hazards.

rebuild.sh --full runs it. By hand, on the VM from the backend/ directory with DATABASE_URL set:
    python -m ingest.load_postgis

After this script completes, redo the hazard overlaps and refresh the materialized views
(rebuild.sh --full does all of this):
    python -m ingest.load_hazard_overlaps
    docker exec ccsvi-pg psql -U ccsvi -d ccsvi -c "REFRESH MATERIALIZED VIEW block_group_metrics;"
    docker exec ccsvi-pg psql -U ccsvi -d ccsvi -c "REFRESH MATERIALIZED VIEW hawaiian_homeland_metrics;"
"""
import json
from pathlib import Path

import psycopg2
import psycopg2.extras

import settings
from pipeline.check_layers import shape_layers

REPO_ROOT = Path(__file__).parent.parent.parent
PUBLIC_DATA = REPO_ROOT / "public" / "data"

# (filename, layer_id matching pointLayers.ts, name property key)
POINT_LAYERS = [
    ("Fire_Stations_(Statewide).geojson",           "fire_stations",     "name"),
    ("Hospitals.geojson",                           "hospitals",         "name"),
    ("Police_Stations_(Statewide).geojson",         "police_stations",   "name"),
    ("emergency_shelters.geojson",                  "shelters",          "BUSNAME"),
    ("Preschools.geojson",                          "preschools",        "name"),
    ("Public_Schools.geojson",                      "public_schools",    "sch_name"),
    ("Private_Schools.geojson",                     "private_schools",   "school"),
    ("National_Bridge_Inventory.geojson",           "bridges",           "structure_"),
    ("HI_Onsite_Sewage_Disposal_Systems.geojson",   "sewage",            "island"),
    ("Wastewater_Treatment_Plants.geojson",         "wastewater_plant",  "wwtp_name"),
    ("Airports_points.geojson",                     "airports",          "airport_na"),
    ("Commercial_Harbors_points.geojson",           "commercial_harbors", "harbor_nam"),
    ("Small_Boat_Harbors_Ramps.geojson",            "small_boat_harbors", "name"),
]

BATCH_SIZE = 500


def _batch_insert(cur, sql, rows):
    for i in range(0, len(rows), BATCH_SIZE):
        psycopg2.extras.execute_batch(cur, sql, rows[i : i + BATCH_SIZE])


def load_block_group_geoms(cur) -> int:
    path = PUBLIC_DATA / "2020_Census_Block_Groups_Stripped.geojson"
    with open(path) as f:
        fc = json.load(f)

    rows = [
        (json.dumps(feat["geometry"]), feat["properties"]["geoid20"])
        for feat in fc["features"]
        if feat.get("geometry") and feat["properties"].get("geoid20")
    ]
    _batch_insert(
        cur,
        "UPDATE geographies SET geom = ST_Multi(ST_GeomFromGeoJSON(%s)) WHERE geoid = %s",
        rows,
    )
    return len(rows)


def load_hawaiian_homeland_geoms(cur) -> int:
    """Update geographies.geom for Hawaiian Homeland geoids.

    Matches on GEOID10 from the GeoJSON — must match geographies.geoid values
    loaded from the Hawaiian Homeland census metrics JSON.
    """
    path = PUBLIC_DATA / "Census_Hawaiian_Homelands_hhl10_Stripped.geojson"
    with open(path) as f:
        fc = json.load(f)

    rows = [
        (json.dumps(feat["geometry"]), feat["properties"]["GEOID10"])
        for feat in fc["features"]
        if feat.get("geometry") and feat["properties"].get("GEOID10")
    ]
    _batch_insert(
        cur,
        "UPDATE geographies SET geom = ST_Multi(ST_GeomFromGeoJSON(%s)) WHERE geoid = %s",
        rows,
    )
    # Report mismatches so we know if GEOID10 doesn't align with geographies.geoid
    cur.execute(
        "SELECT count(*) FROM geographies g "
        "JOIN metrics m ON true "
        "JOIN metric_values mv ON mv.geoid = g.geoid AND mv.metric_id = m.id "
        "WHERE m.dataset_id = '2022_census_hawaiian_homelands' AND g.geom IS NULL"
    )
    null_count = cur.fetchone()[0]
    if null_count:
        print(f"  WARNING: {null_count} Hawaiian Homeland geographies still have NULL geom "
              "(GEOID10 may not match geographies.geoid)")
    return len(rows)


def load_points(cur) -> int:
    cur.execute("TRUNCATE points RESTART IDENTITY")
    total = 0

    for filename, layer_id, name_field in POINT_LAYERS:
        path = settings.POINT_DATA_DIR / filename
        if not path.exists():
            print(f"  WARNING: {path} not found, skipping {layer_id}")
            continue

        with open(path) as f:
            fc = json.load(f)

        rows = []
        for feat in fc["features"]:
            geom = feat.get("geometry")
            if not geom:
                continue
            props = feat.get("properties") or {}
            rows.append((layer_id, props.get(name_field), json.dumps(props), json.dumps(geom)))

        _batch_insert(
            cur,
            "INSERT INTO points (layer_id, name, props, geom) "
            "VALUES (%s, %s, %s, ST_Centroid(ST_GeomFromGeoJSON(%s)))",
            rows,
        )
        total += len(rows)
        print(f"    {layer_id}: {len(rows)} features")

    return total


def load_hazards(cur) -> int:
    cur.execute("TRUNCATE hazards RESTART IDENTITY")
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

        _batch_insert(
            cur,
            "INSERT INTO hazards (hazard_id, sub_id, geom) "
            "VALUES (%s, %s, ST_GeomFromGeoJSON(%s))",
            rows,
        )
        total += len(rows)
        print(f"    {hazard_id}/{sub_id}: {len(rows)} features")

    return total


def main() -> None:
    conn = psycopg2.connect(settings.database_url())
    try:
        with conn.cursor() as cur:
            print("Updating block group geometries...")
            n = load_block_group_geoms(cur)
            print(f"  → {n} block groups")

            print("Updating Hawaiian Homeland geometries...")
            n = load_hawaiian_homeland_geoms(cur)
            print(f"  → {n} homelands attempted")

            print("Populating points...")
            n = load_points(cur)
            print(f"  → {n} total points")

            print("Populating hazards (this may take several minutes)...")
            n = load_hazards(cur)
            print(f"  → {n} total hazard features")

        conn.commit()
        print("\nAll done. Next step — refresh materialized views:")
        print('  docker exec ccsvi-pg psql -U ccsvi -d ccsvi -c "REFRESH MATERIALIZED VIEW block_group_metrics;"')
        print('  docker exec ccsvi-pg psql -U ccsvi -d ccsvi -c "REFRESH MATERIALIZED VIEW hawaiian_homeland_metrics;"')
    finally:
        conn.close()


if __name__ == "__main__":
    main()