"""Saves one dataset, its metrics and their values into datasets / metrics / metric_values.

The census, point-count and raster loaders each work out their numbers and hand them here.
Each loader calls save_dataset inside its own conn.transaction(), so a dataset is saved whole or not at all.
The tables start empty (rebuild.sh drops and recreates them first), so a dataset saved twice stops
with a duplicate-key error.
"""

import json
from dataclasses import dataclass

import asyncpg

# (geographies.type value, hawaiian_homelands flag to write on the dataset)
AREA_TYPES = [
    ("block_group", False),
    ("hawaiian_homeland", True),
]

VALUE_CHUNK_SIZE = 5000


@dataclass
class Dataset:
    id: str
    label: str
    source_type: str
    hawaiian_homelands: bool
    universe: str | None = None
    layer_id: str | None = None
    metadata: dict | None = None


@dataclass
class Metric:
    name: str
    display_order: int
    has_moe: bool = False
    has_percentage: bool = False
    has_moe_pp: bool = False
    # The short name the app looks the metric up by; None for a metric only the table shows
    key: str | None = None


# One metric's value for one area; metric is the metric's name
@dataclass
class Value:
    geoid: str
    metric: str
    absolute: float | None
    margin_of_error: float | None = None
    percentage: float | None = None
    moe_percentage_points: float | None = None
    cv: float | None = None
    moe_derived: bool | None = None


# Writes the dataset, its metrics and their values; returns the number of values
async def save_dataset(conn: asyncpg.Connection, dataset: Dataset, metrics: list[Metric], values: list[Value]) -> int:
    await conn.execute(
        """
        INSERT INTO datasets (id, label, universe, hawaiian_homelands, source_type, layer_id, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
        """,
        dataset.id,
        dataset.label,
        dataset.universe,
        dataset.hawaiian_homelands,
        dataset.source_type,
        dataset.layer_id,
        None if dataset.metadata is None else json.dumps(dataset.metadata),
    )

    await conn.executemany(
        """
        INSERT INTO metrics (dataset_id, name, display_order, has_moe, has_percentage, has_moe_pp, key)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        """,
        [(dataset.id, m.name, m.display_order, m.has_moe, m.has_percentage, m.has_moe_pp, m.key) for m in metrics],
    )

    metric_ids = {
        r["name"]: r["id"]
        for r in await conn.fetch("SELECT id, name FROM metrics WHERE dataset_id = $1", dataset.id)
    }
    rows = [
        (
            v.geoid,
            metric_ids[v.metric],
            v.absolute,
            v.margin_of_error,
            v.percentage,
            v.moe_percentage_points,
            v.cv,
            v.moe_derived,
        )
        for v in values
    ]

    for i in range(0, len(rows), VALUE_CHUNK_SIZE):
        await conn.executemany(
            """
            INSERT INTO metric_values (
                geoid, metric_id, absolute, margin_of_error, percentage,
                moe_percentage_points, cv, moe_derived
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """,
            rows[i : i + VALUE_CHUNK_SIZE],
        )

    return len(rows)
