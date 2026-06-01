#!/usr/bin/env python3
"""Populate geographies.geom, counties, hawaiian_homelands, points, and hazards.

Run on the VM from the backend/ directory:
    export $(sudo cat /etc/ccsvi-api.env | xargs)
    python -m ingest.load_postgis

After this script completes, refresh the materialized views:
    docker exec ccsvi-pg psql -U ccsvi -d ccsvi -c "REFRESH MATERIALIZED VIEW block_group_metrics;"
    docker exec ccsvi-pg psql -U ccsvi -d ccsvi -c "REFRESH MATERIALIZED VIEW hawaiian_homeland_metrics;"
"""
import json
import os
from pathlib import Path

import psycopg2
import psycopg2.extras

REPO_ROOT = Path(__file__).parent.parent.parent
PUBLIC_DATA = REPO_ROOT / "public" / "data"
POINT_DATA_DIR = Path("/home/exouser/ccsvi-data/v05-2026/point_data")
HAZARDS_RAW_DIR = Path("/home/exouser/ccsvi-data/archived/raw_files/Hazards")

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://localhost/ccsvi")

# Hawaii county name (NAME20 field) → Census FIPS GEOID
COUNTY_GEOIDS = {
    "Hawaii": "15001",
    "Honolulu": "15003",
    "Kalawao": "15005",
    "Kauai": "15007",
    "Maui": "15009",
}

# (filename, layer_id matching pointLayers.ts, name property key)
POINT_LAYERS = [
    ("Fire_Stations_(Statewide).geojson",        "fire_stations",   "name"),
    ("Hospitals.geojson",                         "hospitals",       "name"),
    ("Police_Stations_(Statewide).geojson",       "police_stations", "name"),
    ("emergency_shelters.geojson",                "shelters",        "BUSNAME"),
    ("Preschools.geojson",                        "preschools",      "name"),
    ("Public_Schools.geojson",                    "public_schools",  "sch_name"),
    ("Private_Schools.geojson",                   "private_schools", "school"),
    ("National_Bridge_Inventory.geojson",         "bridges",         "structure_"),
    ("HI_Onsite_Sewage_Disposal_Systems.geojson", "sewage",          "island"),
]

# (filename, hazard_id, sub_id, height_ft) — IDs match hazardLayers.ts
HAZARD_LAYERS = [
    ("Flood_Hazard_VE.geojson",                     "flood_hazard",            "Zone_VE",       None),
    ("Flood_Hazard_AE.geojson",                     "flood_hazard",            "Zone_AE",       None),
    ("Flood_Hazard_AO.geojson",                     "flood_hazard",            "Zone_AO",       None),
    ("Flood_Hazard_AH.geojson",                     "flood_hazard",            "Zone_AH",       None),
    ("filtered_slr_cstl_erosn_0pt5ft.geojson",      "erosion",                 "0.5ft_erosion", 0.5),
    ("filtered_slr_cstl_erosn_1pt1ft.geojson",      "erosion",                 "1.1ft_erosion", 1.1),
    ("filtered_slr_cstl_erosn_2pt0ft.geojson",      "erosion",                 "2.0ft_erosion", 2.0),
    ("filtered_slr_cstl_erosn_3pt2ft.geojson",      "erosion",                 "3.2ft_erosion", 3.2),
    ("filtered_slr_potent_fld_hwys_0pt5ft.geojson", "potential_flood_highways", "0.5ft_pfh",    0.5),
    ("filtered_slr_potent_fld_hwys_1pt1ft.geojson", "potential_flood_highways", "1.1ft_pfh",    1.1),
    ("filtered_slr_potent_fld_hwys_2pt0ft.geojson", "potential_flood_highways", "2.0ft_pfh",    2.0),
    ("filtered_slr_potent_fld_hwys_3pt2ft.geojson", "potential_flood_highways", "3.2ft_pfh",    3.2),
    ("filtered_slr_exposure_area_0pt5ft.geojson",   "exposure_area",           "0.5ft_ea",      0.5),
    ("filtered_slr_exposure_area_1pt1ft.geojson",   "exposure_area",           "1.1ft_ea",      1.1),
    ("filtered_slr_exposure_area_2pt0ft.geojson",   "exposure_area",           "2.0ft_ea",      2.0),
    ("filtered_slr_exposure_area_3pt2ft.geojson",   "exposure_area",           "3.2ft_ea",      3.2),
    ("filtered_slr_passive_fld_0pt5ft.geojson",     "passive_flood",           "0.5ft_pf",      0.5),
    ("filtered_slr_passive_fld_1pt1ft.geojson",     "passive_flood",           "1.1ft_pf",      1.1),
    ("filtered_slr_passive_fld_2pt0ft.geojson",     "passive_flood",           "2.0ft_pf",      2.0),
    ("filtered_slr_passive_fld_3pt2ft.geojson",     "passive_flood",           "3.2ft_pf",      3.2),
    ("filtered_sidewalks_and_paths.geojson",        "sidewalks_and_paths",     None,            None),
    ("filtered_road_Hawaii_island.geojson",         "state_roads",             "hawaii_island", None),
    ("filtered_road_Kauai.geojson",                 "state_roads",             "kauai",         None),
    ("filtered_road_Maui.geojson",                  "state_roads",             "maui",          None),
    ("filtered_road_Oahu.geojson",                  "state_roads",             "oahu",          None),
    ("Solar_Insolation_200-250.geojson",            "solar_insolation",        "200_250",       None),
    ("Solar_Insolation_250-300.geojson",            "solar_insolation",        "250_300",       None),
    ("Solar_Insolation_300-350.geojson",            "solar_insolation",        "300_350",       None),
    ("Solar_Insolation_350-400.geojson",            "solar_insolation",        "350_400",       None),
    ("Solar_Insolation_400-450.geojson",            "solar_insolation",        "400_450",       None),
    ("Solar_Insolation_450-500.geojson",            "solar_insolation",        "450_500",       None),
    ("Solar_Insolation_500-550.geojson",            "solar_insolation",        "500_550",       None),
    ("Solar_Insolation_550-600.geojson",            "solar_insolation",        "550_600",       None),
    ("Solar_Insolation_600-650.geojson",            "solar_insolation",        "600_650",       None),
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


def load_counties(cur) -> int:
    path = PUBLIC_DATA / "2020_Census_County_Boundaries_Stripped.geojson"
    with open(path) as f:
        fc = json.load(f)

    cur.execute("TRUNCATE counties")
    rows = []
    for feat in fc["features"]:
        name = feat["properties"].get("NAME20", "")
        geoid = COUNTY_GEOIDS.get(name)
        if not geoid:
            print(f"  WARNING: unknown county '{name}', skipping")
            continue
        rows.append((geoid, name, json.dumps(feat["geometry"])))

    _batch_insert(
        cur,
        "INSERT INTO counties (geoid, name, geom) VALUES (%s, %s, ST_GeomFromGeoJSON(%s))",
        rows,
    )
    return len(rows)


def load_hawaiian_homelands(cur) -> int:
    path = PUBLIC_DATA / "Census_Hawaiian_Homelands_hhl10_Stripped.geojson"
    with open(path) as f:
        fc = json.load(f)

    cur.execute("TRUNCATE hawaiian_homelands RESTART IDENTITY")
    rows = [
        (feat["properties"].get("NAME10"), json.dumps(feat["geometry"]))
        for feat in fc["features"]
        if feat.get("geometry")
    ]
    _batch_insert(
        cur,
        "INSERT INTO hawaiian_homelands (name, geom) VALUES (%s, ST_GeomFromGeoJSON(%s))",
        rows,
    )
    return len(rows)


def load_points(cur) -> int:
    cur.execute("TRUNCATE points RESTART IDENTITY")
    total = 0

    for filename, layer_id, name_field in POINT_LAYERS:
        path = POINT_DATA_DIR / filename
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

    for filename, hazard_id, sub_id, height_ft in HAZARD_LAYERS:
        path = HAZARDS_RAW_DIR / filename
        if not path.exists():
            print(f"  WARNING: {path} not found, skipping {hazard_id}/{sub_id}")
            continue

        with open(path) as f:
            fc = json.load(f)

        rows = []
        for feat in fc["features"]:
            geom = feat.get("geometry")
            if not geom:
                continue
            props = feat.get("properties") or {}
            zone = props.get("fld_zone") or props.get("zone")
            rows.append((hazard_id, sub_id, height_ft, zone, json.dumps(props), json.dumps(geom)))

        _batch_insert(
            cur,
            "INSERT INTO hazards (hazard_id, sub_id, height_ft, zone, props, geom) "
            "VALUES (%s, %s, %s, %s, %s, ST_GeomFromGeoJSON(%s))",
            rows,
        )
        total += len(rows)
        print(f"    {hazard_id}/{sub_id}: {len(rows)} features")

    return total


def main() -> None:
    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn.cursor() as cur:
            print("Updating block group geometries...")
            n = load_block_group_geoms(cur)
            print(f"  → {n} block groups")

            print("Updating Hawaiian Homeland geometries...")
            n = load_hawaiian_homeland_geoms(cur)
            print(f"  → {n} homelands attempted")

            print("Populating counties...")
            n = load_counties(cur)
            print(f"  → {n} counties")

            print("Populating hawaiian_homelands table...")
            n = load_hawaiian_homelands(cur)
            print(f"  → {n} homelands")

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