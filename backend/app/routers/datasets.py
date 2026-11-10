import json
from collections.abc import Callable
from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..db import ConnDep
from ..reliability import reliability

router = APIRouter(prefix="/api/v1/datasets")


# ── Pydantic models ──────────────────────────────────────────────────────────

# One table column: its heading and whether its cells are numbers or text
class TableColumn(BaseModel):
    heading: str
    type: Literal["number", "text"]


# One area's row: its geoid and its cells, in column order
class TableRow(BaseModel):
    geoid: str
    cells: list[str | int | float | None]


class DatasetTable(BaseModel):
    columns: list[TableColumn]
    rows: list[TableRow]

# A metric's filter column, and whether the map and filter show its percentage or its count
class MetricConfig(BaseModel):
    mv_column: str | None = None
    kind: Literal["percentage", "count"]


class DatasetMetadata(BaseModel):
    table_id: str
    program: str
    period: str
    citation: str


class DatasetRecord(BaseModel):
    label: str
    hawaiian_homelands: bool
    source_type: str
    layer_id: str | None
    metadata: DatasetMetadata | None
    metrics: dict[str, MetricConfig]


class ReliabilityRecord(BaseModel):
    label: str
    tier: str


class MetricValueRecord(BaseModel):
    absolute: float | None
    margin_of_error: float | None
    percentage: float | None

    moe_percentage_points: float | None
    reliability: ReliabilityRecord
    moe_derived: bool | None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get(
    "",
    response_model=dict[str, DatasetRecord],
    summary="Dataset catalog with metric metadata",
)
async def get_datasets(conn: ConnDep) -> Any:
    rows = await conn.fetch(
        """
        SELECT d.id, d.label, d.hawaiian_homelands, d.source_type, d.layer_id, d.metadata,
               m.name, m.mv_column, m.has_percentage
        FROM datasets d
        JOIN metrics m ON m.dataset_id = d.id
        ORDER BY d.id, m.display_order NULLS LAST, m.name
        """
    )
    result: dict[str, Any] = {}
    for row in rows:
        dataset_id = row["id"]
        if dataset_id not in result:
            result[dataset_id] = {
                "label": row["label"],
                "hawaiian_homelands": row["hawaiian_homelands"],
                "source_type": row["source_type"],
                "layer_id": row["layer_id"],
                "metadata": json.loads(row["metadata"]) if row["metadata"] else None,
                "metrics": {},
            }
        result[dataset_id]["metrics"][row["name"]] = {
            "mv_column": row["mv_column"],
            "kind": "percentage" if row["has_percentage"] else "count",
        }
    return result


@router.get(
    "/{dataset_id}/table",
    response_model=DatasetTable,
    summary="A dataset's table: its columns (heading and type), then one row per area with its cells in column order",
)
async def get_dataset_table(dataset_id: str, conn: ConnDep) -> Any:

    metric_rows = await conn.fetch(
        """
        SELECT m.id, m.name, m.has_moe, m.has_percentage, m.has_moe_pp, d.universe
        FROM metrics m
        JOIN datasets d ON d.id = m.dataset_id
        WHERE m.dataset_id = $1
        ORDER BY m.display_order NULLS LAST, m.id
        """,
        dataset_id,
    )
    if not metric_rows:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found")

    # Names as users see them. "(calc.)" stays in the stored name as a pipeline label but isn't
    # shown, and "Total" says what it counts, e.g. "Total (Occupied housing units)"
    def display_name(r) -> str:
        if r["name"] == "Total":
            return f"Total ({r['universe']})"
        return r["name"].replace(" (calc.)", "")

    # The columns in order as (heading, type); each metric's own columns also say how to read their cell
    columns: list[tuple[str, str]] = [
        ("Geography", "text"),
        ("Geographic Area Name", "text"),
        ("Census Population", "number"),
    ]
    readers: dict[int, list[tuple[int, Callable[[Any], Any]]]] = {}
    for r in metric_rows:
        name = display_name(r)
        parts: list[tuple[str, str, Callable[[Any], Any]]] = [(f"Estimate!!{name}", "number", lambda v: v["absolute"])]
        if r["has_moe"]:
            parts += [
                (f"Margin of Error!!{name}", "number", lambda v: v["margin_of_error"]),
                (
                    f"Reliability!!{name}",
                    "text",
                    lambda v: reliability(v["absolute"], v["margin_of_error"], v["cv"], True)["label"],
                ),
            ]
        if r["has_percentage"]:
            parts.append((f"{name} (%)", "number", lambda v: v["percentage"]))
        if r["has_moe_pp"]:
            parts.append((f"Margin of Error!!{name} (pp)", "number", lambda v: v["moe_percentage_points"]))
        readers[r["id"]] = [(len(columns) + i, read) for i, (_, _, read) in enumerate(parts)]
        columns += [(heading, kind) for heading, kind, _ in parts]

    value_rows = await conn.fetch(
        """
        SELECT g.geoid, g.name, g.population,
               mv.metric_id,
               mv.absolute::float,
               mv.margin_of_error::float,
               mv.percentage::float,
               mv.moe_percentage_points::float,
               mv.cv::float
        FROM geographies g
        JOIN metric_values mv ON mv.geoid = g.geoid
        WHERE mv.metric_id = ANY($1::int[])
        ORDER BY g.geoid
        """,
        list(readers),
    )

    rows: dict[str, list[Any]] = {}
    for v in value_rows:
        if v["geoid"] not in rows:
            # Geography reads "1500000US<geoid>" on every row, the Census code form for a block group
            rows[v["geoid"]] = [f"1500000US{v['geoid']}", v["name"], v["population"]] + [None] * (len(columns) - 3)
        cells = rows[v["geoid"]]
        for position, read in readers[v["metric_id"]]:
            cells[position] = read(v)

    return {
        "columns": [{"heading": heading, "type": kind} for heading, kind in columns],
        "rows": [{"geoid": geoid, "cells": cells} for geoid, cells in rows.items()],
    }


@router.get(
    "/{dataset_id}/values",
    response_model=dict[str, MetricValueRecord],
    summary="Per-geoid values for one metric of a dataset",
)
async def get_metric_values(conn: ConnDep, dataset_id: str, metric: str) -> Any:
    rows = await conn.fetch(
        """
        SELECT mv.geoid,
               mv.absolute::float,
               mv.margin_of_error::float,
               mv.percentage::float,
               mv.moe_percentage_points::float,
               mv.cv::float,
               mv.moe_derived,
               m.has_moe
        FROM metric_values mv
        JOIN metrics m ON m.id = mv.metric_id
        WHERE m.dataset_id = $1 AND m.name = $2
        """,
        dataset_id,
        metric,
    )
    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"No data for dataset='{dataset_id}' metric='{metric}'",
        )
    return {
        row["geoid"]: {
            "absolute": row["absolute"],
            "margin_of_error": row["margin_of_error"],
            "percentage": row["percentage"],
            "moe_percentage_points": row["moe_percentage_points"],
            "reliability": reliability(row["absolute"], row["margin_of_error"], row["cv"], row["has_moe"]),
            "moe_derived": row["moe_derived"],
        }
        for row in rows
    }
