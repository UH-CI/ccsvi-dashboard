#!/usr/bin/env python3
"""One-time migration from the initial flat schema to the normalized schema.

Reads:
  - public/data/metrics/census_datasets_config.json  → datasets + metrics tables
  - census_metrics table (already in Postgres)        → geographies + metric_values tables

On success, drops the old census_metrics and vulnerability.* tables and deletes
census_datasets_config.json. 

Usage (from the backend/ directory):
    DATABASE_URL=postgresql://ccsvi:<pass>@localhost/ccsvi python3 -m ingest.migrate_schema
"""

import asyncio
import json
import os
from pathlib import Path

import asyncpg

CONFIG_PATH = (
    Path(__file__).parent.parent.parent
    / "public" / "data" / "metrics" / "census_datasets_config.json"
)

VULNERABILITY_TABLES = [
    "2022_census_hawaiian_homelands",
    "age_of_structure",
    "aggregate_vehicles",
    "genders",
    "health_insurance",
    "households_w_computer",
    "income_share_of_fpl",
    "internet_subscription",
    "limited_english_speaking",
    "living_arrangements",
    "person_under_5_65_females",
    "person_under_5_65_males",
    "population_group_quarters",
    "race_origin",
    "tenure",
]

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://localhost/ccsvi")


async def migrate() -> None:
    conn = await asyncpg.connect(DATABASE_URL)

    try:
        # ── Step 1: seed datasets + metrics from config JSON ──────────────────
        print("Loading census_datasets_config.json...")
        with open(CONFIG_PATH) as f:
            config: dict = json.load(f)

        print(f"  {len(config)} datasets found")

        dataset_rows = [
            (dataset_id, cfg.get("metricLabel", ""), cfg.get("hawaiianHomelands", False))
            for dataset_id, cfg in config.items()
        ]
        await conn.executemany(
            """
            INSERT INTO datasets (id, label, hawaiian_homelands)
            VALUES ($1, $2, $3)
            ON CONFLICT (id) DO UPDATE SET
                label              = EXCLUDED.label,
                hawaiian_homelands = EXCLUDED.hawaiian_homelands
            """,
            dataset_rows,
        )
        print(f"  → {len(dataset_rows)} datasets upserted")

        # Build metric rows: (dataset_id, metric_name, classification_mode)
        metric_rows = [
            (dataset_id, metric_name, metric_cfg.get("classificationMode", "q"))
            for dataset_id, cfg in config.items()
            for metric_name, metric_cfg in cfg.get("columnThresholds", {}).items()
        ]
        await conn.executemany(
            """
            INSERT INTO metrics (dataset_id, name, classification_mode)
            VALUES ($1, $2, $3)
            ON CONFLICT (dataset_id, name) DO UPDATE SET
                classification_mode = EXCLUDED.classification_mode
            """,
            metric_rows,
        )
        print(f"  → {len(metric_rows)} metrics upserted")

        # ── Step 2: build metric_id lookup map ────────────────────────────────
        # Maps (dataset_id, metric_name) → metric_id so we can reference it
        # when inserting metric_values rows.
        rows = await conn.fetch("SELECT id, dataset_id, name FROM metrics")
        metric_id_map: dict[tuple[str, str], int] = {
            (r["dataset_id"], r["name"]): r["id"] for r in rows
        }

        # ── Step 3: seed geographies + metric_values from census_metrics ──────
        print("Reading census_metrics table...")
        records = await conn.fetch(
            "SELECT id, type, name, block_group, census_tract, county, state, population, metrics "
            "FROM census_metrics"
        )
        print(f"  {len(records)} geoids found")

        geography_rows = [
            (
                r["id"],
                r["type"],
                r["name"],
                r["block_group"],
                r["census_tract"],
                r["county"],
                r["state"],
                r["population"],
            )
            for r in records
        ]
        await conn.executemany(
            """
            INSERT INTO geographies (geoid, type, name, block_group, census_tract, county, state, population)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (geoid) DO UPDATE SET
                type         = EXCLUDED.type,
                name         = EXCLUDED.name,
                block_group  = EXCLUDED.block_group,
                census_tract = EXCLUDED.census_tract,
                county       = EXCLUDED.county,
                state        = EXCLUDED.state,
                population   = EXCLUDED.population
            """,
            geography_rows,
        )
        print(f"  → {len(geography_rows)} geographies upserted")

        # Unpack the metrics JSONB blob into individual metric_values rows.
        # The blob shape is: { dataset_id: { metric_name: { absolute, margin_of_error, percentage } } }
        value_rows: list[tuple] = []
        skipped = 0

        for r in records:
            geoid = r["id"]
            metrics_blob: dict = json.loads(r["metrics"])

            for dataset_id, metric_dict in metrics_blob.items():
                for metric_name, values in metric_dict.items():
                    metric_id = metric_id_map.get((dataset_id, metric_name))
                    if metric_id is None:
                        # Metric exists in data but not in config — skip
                        skipped += 1
                        continue
                    value_rows.append((
                        geoid,
                        metric_id,
                        values.get("absolute"),
                        values.get("margin_of_error"),
                        values.get("percentage"),
                    ))

        print(f"  {len(value_rows)} metric_values rows to insert ({skipped} skipped — not in config)")

        # Insert in chunks to avoid overwhelming the connection
        chunk_size = 5000
        for i in range(0, len(value_rows), chunk_size):
            chunk = value_rows[i : i + chunk_size]
            await conn.executemany(
                """
                INSERT INTO metric_values (geoid, metric_id, absolute, margin_of_error, percentage)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (geoid, metric_id) DO UPDATE SET
                    absolute        = EXCLUDED.absolute,
                    margin_of_error = EXCLUDED.margin_of_error,
                    percentage      = EXCLUDED.percentage
                """,
                chunk,
            )
            print(f"  → inserted rows {i + 1}–{min(i + chunk_size, len(value_rows))}")

        # ── Step 4: verify row counts before dropping anything ─────────────────
        geo_count = await conn.fetchval("SELECT COUNT(*) FROM geographies")
        mv_count = await conn.fetchval("SELECT COUNT(*) FROM metric_values")
        ds_count = await conn.fetchval("SELECT COUNT(*) FROM datasets")
        m_count = await conn.fetchval("SELECT COUNT(*) FROM metrics")

        print(f"\nVerification:")
        print(f"  datasets:      {ds_count}")
        print(f"  metrics:       {m_count}")
        print(f"  geographies:   {geo_count}")
        print(f"  metric_values: {mv_count}")

        if geo_count == 0 or mv_count == 0:
            raise RuntimeError("Migration produced empty tables — aborting cleanup")

        # ── Step 5: drop old tables ────────────────────────────────────────────
        print("\nDropping old tables...")
        await conn.execute("DROP TABLE IF EXISTS census_metrics CASCADE")
        print("  → dropped census_metrics")

        for table in VULNERABILITY_TABLES:
            await conn.execute(f'DROP TABLE IF EXISTS vulnerability."{table}" CASCADE')
        await conn.execute("DROP SCHEMA IF EXISTS vulnerability")
        print(f"  → dropped {len(VULNERABILITY_TABLES)} vulnerability.* tables")

        # ── Step 6: delete config JSON ─────────────────────────────────────────
        if CONFIG_PATH.exists():
            CONFIG_PATH.unlink()
            print(f"  → deleted {CONFIG_PATH.name}")

        print("\nMigration complete.")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(migrate())