#!/usr/bin/env python3
"""Fills in metrics.mv_column from db/mv_columns.py (the census menu and point layers) so the API can tell the frontend
which block_group_metrics or hawaiian_homeland_metrics column each metric corresponds to
(needed for the cross-dataset filter UI's threshold dropdown). Safe to run more than once.

rebuild.sh runs it. By hand, from the backend/ directory with DATABASE_URL set:
    python -m ingest.add_mv_column
"""

import asyncio
import sys

import asyncpg

import settings
from db.mv_columns import BLOCK_GROUP_COLUMNS, HAWAIIAN_HOMELAND_COLUMNS


async def apply() -> None:
    conn = await asyncpg.connect(settings.database_url())

    try:
        await conn.execute("UPDATE metrics SET mv_column = NULL")

        all_columns = BLOCK_GROUP_COLUMNS + HAWAIIAN_HOMELAND_COLUMNS
        unmatched = []
        for mv_column, dataset_id, name in all_columns:
            result = await conn.execute(
                "UPDATE metrics SET mv_column = $1 WHERE dataset_id = $2 AND name = $3",
                mv_column,
                dataset_id,
                name,
            )
            if result == "UPDATE 0":
                unmatched.append((mv_column, dataset_id, name))

        if unmatched:
            print(f"{len(unmatched)} mapping(s) matched no metric (left unset, not fatal):", file=sys.stderr)
            for mv_column, dataset_id, name in unmatched:
                print(f"  {mv_column}: {dataset_id} | {name}", file=sys.stderr)

        print(f"mv_column set on {len(all_columns)} metrics.")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(apply())