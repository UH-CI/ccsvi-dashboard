from typing import Any

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel

from ..db import ConnDep

router = APIRouter()

# Order for the metric dropdowns. 
CATALOG_METRIC_ORDER = "column_order"

_CATALOG_ORDER_SQL = {
# Preserves metric order as they appear in dataset as columns
    "column_order": "m.display_order NULLS LAST, m.name",
# Alphabetic order
    "name": "m.name",
}


# ── Pydantic models ──────────────────────────────────────────────────────────

class MetricConfig(BaseModel):
    classificationMode: str
    mvColumn: str | None = None


class DatasetRecord(BaseModel):
    metricLabel: str
    hawaiianHomelands: bool
    columnThresholds: dict[str, MetricConfig]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get(
    "/api/v1/datasets",
    response_model=dict[str, DatasetRecord],
    summary="Dataset catalog with metric metadata",
)
async def get_datasets(conn: ConnDep, response: Response) -> dict[str, Any]:
    response.headers["Cache-Control"] = "public, max-age=86400"
    rows = await conn.fetch(
        f"""
        SELECT d.id, d.label, d.hawaiian_homelands, m.name, m.classification_mode, m.mv_column
        FROM datasets d
        JOIN metrics m ON m.dataset_id = d.id
        ORDER BY d.id, {_CATALOG_ORDER_SQL[CATALOG_METRIC_ORDER]}
        """
    )
    result: dict[str, Any] = {}
    for row in rows:
        dataset_id = row["id"]
        if dataset_id not in result:
            result[dataset_id] = {
                "metricLabel": row["label"],
                "hawaiianHomelands": row["hawaiian_homelands"],
                "columnThresholds": {},
            }
        result[dataset_id]["columnThresholds"][row["name"]] = {
            "classificationMode": row["classification_mode"],
            "mvColumn": row["mv_column"],
        }
    return result


@router.get(
    "/api/v1/datasets/{dataset_id}/table",
    summary="Full dataset rows for TableViewer",
)
async def get_dataset_table(
    dataset_id: str, conn: ConnDep, response: Response
) -> list[dict[str, Any]]:
    response.headers["Cache-Control"] = "public, max-age=86400"

    metric_rows = await conn.fetch(
        """
        SELECT id, name, has_moe, has_percentage, has_moe_pp
        FROM metrics
        WHERE dataset_id = $1
        ORDER BY display_order NULLS LAST, id
        """,
        dataset_id,
    )
    if not metric_rows:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found")

    metric_id_to_name = {r["id"]: r["name"] for r in metric_rows}

    column_template: dict[str, Any] = {
        "Geography": None,
        "Geographic Area Name": None,
        "Census Population": None,
    }
    for r in metric_rows:
        name = r["name"]
        column_template[f"Estimate!!{name}"] = None
        if r["has_moe"]:
            column_template[f"Margin of Error!!{name}"] = None
        if r["has_percentage"]:
            column_template[f"{name} (%)"] = None
        if r["has_moe_pp"]:
            column_template[f"Margin of Error!!{name} (%)"] = None

    value_rows = await conn.fetch(
        """
        SELECT g.geoid, g.name, g.population,
               mv.metric_id,
               mv.absolute::float,
               mv.margin_of_error::float,
               mv.percentage::float,
               mv.moe_percentage_points::float
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
            (f"Margin of Error!!{metric_name} (%)", row["moe_percentage_points"]),
        ):
            if label in column_template or value is not None:
                geoid_data[geoid][label] = value

    return list(geoid_data.values())
