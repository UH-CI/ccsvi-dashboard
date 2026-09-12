#!/usr/bin/env python3
"""Fills in metrics.mv_column from db/mv_columns.py so the API can tell the frontend
which block_group_metrics column each metric corresponds to (needed for the
cross-dataset filter UI's threshold dropdown). Safe to run more than once.

Usage (from the backend/ directory):
    DATABASE_URL=postgresql://ccsvi:<pass>@localhost/ccsvi python3 -m ingest.add_mv_column
"""

import asyncio
import os
import sys

import asyncpg

from db.mv_columns import BLOCK_GROUP_COLUMNS

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://localhost/ccsvi")


async def apply() -> None:
    conn = await asyncpg.connect(DATABASE_URL)

    try:
        await conn.execute("UPDATE metrics SET mv_column = NULL")

        unmatched = []
        for mv_column, dataset_id, name, _source in BLOCK_GROUP_COLUMNS:
            result = await conn.execute(
                "UPDATE metrics SET mv_column = $1 WHERE dataset_id = $2 AND name = $3",
                mv_column,
                dataset_id,
                name,
            )
            if result == "UPDATE 0":
                unmatched.append((mv_column, dataset_id, name))

        if unmatched:
            print(f"{len(unmatched)} mapping(s) matched no metric:", file=sys.stderr)
            for mv_column, dataset_id, name in unmatched:
                print(f"  {mv_column}: {dataset_id} | {name}", file=sys.stderr)
            print("Fix db/mv_columns.py and re-run.", file=sys.stderr)
            sys.exit(1)

        print(f"mv_column set on {len(BLOCK_GROUP_COLUMNS)} metrics.")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(apply())