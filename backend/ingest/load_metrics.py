#!/usr/bin/env python3
"""Load census_metrics_by_block_group.json into PostgreSQL db.

Usage (from the backend/ directory):
    DATABASE_URL=postgresql://localhost/ccsvi python -m ingest.load_metrics
"""
import json
import os
from pathlib import Path

import psycopg2

METRICS_PATH = (
    Path(__file__).parent.parent.parent
    / "public"
    / "data"
    / "metrics"
    / "census_metrics_by_block_group.json"
)
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://localhost/ccsvi")


def main() -> None:
    print("Loading census metrics...")
    with open(METRICS_PATH) as f:
        data: dict = json.load(f)

    rows = [
        (
            id_,
            entry.get("type", ""),
            entry.get("name"),
            entry.get("block_group"),
            entry.get("census_tract"),
            entry.get("county"),
            entry.get("state"),
            entry.get("population"),
            json.dumps(entry.get("metrics", {})),
        )
        for id_, entry in data.items()
    ]

    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE census_metrics")
            cur.executemany(
                """
                INSERT INTO census_metrics
                    (id, type, name, block_group, census_tract, county, state, population, metrics)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    type       = EXCLUDED.type,
                    name       = EXCLUDED.name,
                    population = EXCLUDED.population,
                    metrics    = EXCLUDED.metrics
                """,
                rows,
            )
        conn.commit()
        print(f"  → {len(rows)} records")
    finally:
        conn.close()


if __name__ == "__main__":
    main()