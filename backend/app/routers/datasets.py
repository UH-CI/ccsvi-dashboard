import json
from collections.abc import Callable
from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..db import ConnDep
from ..reliability import reliability

router = APIRouter(prefix="/api/v1/datasets")


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


@router.get(
    "",
    response_model=dict[str, DatasetRecord],
    summary="Dataset catalog",
)
async def get_datasets(conn: ConnDep) -> Any:
    rows = await conn.fetch(
        "SELECT id, label, hawaiian_homelands, source_type, layer_id, metadata FROM datasets ORDER BY id"
    )
    return {
        row["id"]: {
            "label": row["label"],
            "hawaiian_homelands": row["hawaiian_homelands"],
            "source_type": row["source_type"],
            "layer_id": row["layer_id"],
            "metadata": json.loads(row["metadata"]) if row["metadata"] else None,
        }
        for row in rows
    }


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
