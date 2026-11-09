import json
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..db import ConnDep
from ..reliability import reliability

router = APIRouter(prefix="/api/v1/datasets")


# ── Pydantic models ──────────────────────────────────────────────────────────

class MetricConfig(BaseModel):
    mv_column: str | None = None


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
        SELECT d.id, d.label, d.hawaiian_homelands, d.source_type, d.layer_id, d.metadata, m.name, m.mv_column
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
        result[dataset_id]["metrics"][row["name"]] = {"mv_column": row["mv_column"]}
    return result


@router.get(
    "/{dataset_id}/table",
    response_model=list[dict[str, str | int | float | None]],
    summary="Full dataset rows for TableViewer",
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

    metric_id_to_name = {r["id"]: display_name(r) for r in metric_rows}
    metric_id_has_moe = {r["id"]: r["has_moe"] for r in metric_rows}

    column_template: dict[str, Any] = {
        "Geography": None,
        "Geographic Area Name": None,
        "Census Population": None,
    }
    for r in metric_rows:
        name = metric_id_to_name[r["id"]]
        column_template[f"Estimate!!{name}"] = None
        if r["has_moe"]:
            column_template[f"Margin of Error!!{name}"] = None
            column_template[f"Reliability!!{name}"] = None
        if r["has_percentage"]:
            column_template[f"{name} (%)"] = None
        if r["has_moe_pp"]:
            column_template[f"Margin of Error!!{name} (pp)"] = None

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
        list(metric_id_to_name.keys()),
    )

    geoid_data: dict[str, dict[str, Any]] = {}
    for row in value_rows:
        geoid = row["geoid"]
        if geoid not in geoid_data:
            # Prefix matches Census block-group GEOID format (summary level 150).
            # The TableViewer strips this prefix for map-sync; it also prevents
            # the all-digit geoid from being misclassified as a numeric column.
            geoid_data[geoid] = dict(column_template)
            geoid_data[geoid]["Geography"] = f"1500000US{geoid}"
            geoid_data[geoid]["Geographic Area Name"] = row["name"]
            geoid_data[geoid]["Census Population"] = row["population"]

        metric_name = metric_id_to_name[row["metric_id"]]
        # A column we planned above is always filled in, even when empty.
        # Any other column is only added if it has a value.
        for label, value in (
            (f"Estimate!!{metric_name}", row["absolute"]),
            (f"Margin of Error!!{metric_name}", row["margin_of_error"]),
            (f"{metric_name} (%)", row["percentage"]),
            (f"Margin of Error!!{metric_name} (pp)", row["moe_percentage_points"]),
        ):
            if label in column_template or value is not None:
                geoid_data[geoid][label] = value
        if metric_id_has_moe[row["metric_id"]]:
            geoid_data[geoid][f"Reliability!!{metric_name}"] = reliability(
                row["absolute"], row["margin_of_error"], row["cv"], True
            )["label"]

    return list(geoid_data.values())


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
