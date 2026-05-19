import json
from typing import Any

from fastapi import APIRouter, HTTPException

from ..db import ConnDep

router = APIRouter()

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