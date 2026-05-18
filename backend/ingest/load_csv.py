#!/usr/bin/env python3
"""Load vulnerability CSVs into PostgreSQL.

Usage (from the backend/ directory):
    DATABASE_URL=postgresql://localhost/ccsvi python -m ingest.load_csv
"""
import csv
import json
import os
from pathlib import Path

import psycopg2

DATA_DIR = (
    Path(__file__).parent.parent.parent / "public" / "data" / "vulnerability_datasets"
)
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://localhost/ccsvi")


def load_csv(conn: "psycopg2.connection", csv_path: Path) -> None:
    table = csv_path.stem  # filename without .csv extension
    print(f"Loading {table}...")

    rows: list[tuple[str, str]] = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            geoid = row.get("Geography", "").strip()
            if geoid:
                rows.append((geoid, json.dumps(dict(row))))

    with conn.cursor() as cur:
        cur.execute(f'TRUNCATE vulnerability."{table}"')
        cur.executemany(
            f'INSERT INTO vulnerability."{table}" (geoid, row_data) VALUES (%s, %s)'
            f" ON CONFLICT (geoid) DO UPDATE SET row_data = EXCLUDED.row_data",
            rows,
        )
    conn.commit()
    print(f"  → {len(rows)} rows")


def main() -> None:
    conn = psycopg2.connect(DATABASE_URL)
    try:
        for csv_path in sorted(DATA_DIR.glob("*.csv")):
            load_csv(conn, csv_path)
    finally:
        conn.close()


if __name__ == "__main__":
    main()