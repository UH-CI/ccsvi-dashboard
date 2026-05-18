from typing import Any

from fastapi import APIRouter, HTTPException

from ..db import ConnDep

router = APIRouter()

ALLOWED_DATASETS = frozenset({
    "2022_census_hawaiian_homelands",
    "age_of_structure",
    "aggregate_vehicles",
    "genders",
    "health_insurance",
    "households_w_computer",
    "income_share_of_fpl",
    "internet_subscription",
    "limited_english_speaking",
    "living_arrangements",
    "person_under_5_65_females",
    "person_under_5_65_males",
    "population_group_quarters",
    "race_origin",
    "tenure",
})

# Pre-build safe SQL table references at import so they aren't recomputed on every request.
_TABLE = {name: f'vulnerability."{name}"' for name in ALLOWED_DATASETS}


@router.get("/api/v1/metrics/{dataset}")
async def get_metrics(dataset: str, conn: ConnDep) -> list[dict[str, Any]]:
    if dataset not in _TABLE:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset}' not found")
    rows = await conn.fetch(f"SELECT row_data FROM {_TABLE[dataset]}")
    return [dict(r["row_data"]) for r in rows]