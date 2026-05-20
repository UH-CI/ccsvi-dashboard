from typing import Any

from fastapi import APIRouter, HTTPException, Response

from ..db import ConnDep

router = APIRouter()


@router.get("/api/v1/datasets")
async def get_datasets(conn: ConnDep, response: Response) -> dict[str, Any]:
    response.headers["Cache-Control"] = "public, max-age=86400"
    rows = await conn.fetch(
        """
        SELECT d.id, d.label, d.hawaiian_homelands, m.name, m.classification_mode
        FROM datasets d
        JOIN metrics m ON m.dataset_id = d.id
        ORDER BY d.id, m.name
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
        }
    return result


@router.get("/api/v1/datasets/{dataset_id}/table")
async def get_dataset_table(
    dataset_id: str, conn: ConnDep, response: Response
) -> list[dict[str, Any]]:
    response.headers["Cache-Control"] = "public, max-age=86400"

    metric_rows = await conn.fetch(
        "SELECT id, name FROM metrics WHERE dataset_id = $1 ORDER BY id",
        dataset_id,
    )
    if not metric_rows:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found")

    metric_id_to_name = {r["id"]: r["name"] for r in metric_rows}

    value_rows = await conn.fetch(
        """
        SELECT g.geoid, mv.metric_id, mv.absolute::float, mv.percentage::float
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
            geoid_data[geoid] = {"Geography": geoid}
        name = metric_id_to_name[row["metric_id"]]
        geoid_data[geoid][name] = row["absolute"]
        if row["percentage"] is not None:
            geoid_data[geoid][f"{name} (%)"] = row["percentage"]

    return list(geoid_data.values())
