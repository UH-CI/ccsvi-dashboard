import json
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Response

from ..db import ConnDep

router = APIRouter()


@router.get("/api/v1/census-metrics")
async def get_census_metrics(conn: ConnDep, response: Response) -> dict[str, Any]:
    response.headers["Cache-Control"] = "public, max-age=86400"
    rows = await conn.fetch(
        "SELECT id, type, name, block_group, census_tract, county, state, population, metrics "
        "FROM census_metrics"
    )
    return {
        row["id"]: {
            "type": row["type"],
            "name": row["name"],
            "block_group": row["block_group"],
            "census_tract": row["census_tract"],
            "county": row["county"],
            "state": row["state"],
            "population": row["population"],
            "metrics": json.loads(row["metrics"]),
        }
        for row in rows
    }


@router.get("/api/v1/metric-values")
async def get_metric_values(
    conn: ConnDep,
    response: Response,
    dataset: str = Query(...),
    metric: str = Query(...),
) -> dict[str, Any]:
    response.headers["Cache-Control"] = "public, max-age=86400"
    rows = await conn.fetch(
        """
        SELECT mv.geoid, mv.absolute, mv.margin_of_error, mv.percentage
        FROM metric_values mv
        JOIN metrics m ON m.id = mv.metric_id
        WHERE m.dataset_id = $1 AND m.name = $2
        """,
        dataset,
        metric,
    )
    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"No data for dataset='{dataset}' metric='{metric}'",
        )
    return {
        row["geoid"]: {
            "absolute": row["absolute"],
            "margin_of_error": row["margin_of_error"],
            "percentage": row["percentage"],
        }
        for row in rows
    }


@router.get("/api/v1/block-groups/{geoid}")
async def get_block_group(geoid: str, conn: ConnDep) -> dict[str, Any]:
    row = await conn.fetchrow(
        "SELECT id, type, name, block_group, census_tract, county, state, population, metrics "
        "FROM census_metrics WHERE id = $1",
        geoid,
    )
    if row is None:
        raise HTTPException(status_code=404, detail=f"Block group '{geoid}' not found")
    result = dict(row)
    result["metrics"] = json.loads(result["metrics"])
    return result