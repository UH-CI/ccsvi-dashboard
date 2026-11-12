from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..db import ConnDep
from ..reliability import reliability

router = APIRouter(prefix="/api/v1/metrics")


# A metric the app looks up: its dataset, its name in the data, and whether the map and filter show its percentage or its count
class MetricRecord(BaseModel):
    dataset: str
    name: str
    kind: Literal["percentage", "count"]


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


@router.get(
    "",
    response_model=dict[str, MetricRecord],
    summary="Every metric the app looks up, by its key",
)
async def get_metrics(conn: ConnDep) -> Any:
    rows = await conn.fetch(
        "SELECT key, dataset_id, name, has_percentage FROM metrics WHERE key IS NOT NULL ORDER BY dataset_id, display_order"
    )
    return {
        row["key"]: {
            "dataset": row["dataset_id"],
            "name": row["name"],
            "kind": "percentage" if row["has_percentage"] else "count",
        }
        for row in rows
    }


@router.get(
    "/{key}/values",
    response_model=dict[str, MetricValueRecord],
    summary="One metric's value for every area",
)
async def get_metric_values(conn: ConnDep, key: str) -> Any:
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
        WHERE m.key = $1
        """,
        key,
    )
    if not rows:
        raise HTTPException(status_code=404, detail=f"No data for metric '{key}'")
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
