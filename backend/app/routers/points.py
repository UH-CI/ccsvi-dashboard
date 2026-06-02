import json
from typing import Any, Literal

from fastapi import APIRouter, Query
from pydantic import BaseModel, ConfigDict

from ..db import ConnDep

router = APIRouter()


# ── Pydantic models ──────────────────────────────────────────────────────────

class PointProperties(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: int
    layer_id: str
    name: str | None


class PointFeature(BaseModel):
    type: Literal["Feature"]
    geometry: dict[str, Any]
    properties: PointProperties


class PointFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"]
    features: list[PointFeature]


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.get(
    "/api/v1/points",
    response_model=PointFeatureCollection,
    summary="Query point features by layer and/or full-text search",
    description=(
        "Returns a GeoJSON FeatureCollection from the points table. "
        "Supports filtering by layer_id (exact match) and full-text search on "
        "feature name via plainto_tsquery (uses the idx_points_name_fts GIN index). "
        "Both params are optional; omitting both returns all points."
    ),
)
async def get_points(
    conn: ConnDep,
    layer_id: str | None = Query(None, description="Layer ID, e.g. 'hospitals'"),
    q: str | None = Query(None, description="Full-text search term on feature name"),
) -> PointFeatureCollection:
    conditions: list[str] = []
    params: list[Any] = []

    if layer_id:
        params.append(layer_id)
        conditions.append(f"layer_id = ${len(params)}")

    if q:
        params.append(q)
        conditions.append(
            f"to_tsvector('english', coalesce(name, '')) "
            f"@@ plainto_tsquery('english', ${len(params)})"
        )

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    sql = (
        f"SELECT id, layer_id, name, props, ST_AsGeoJSON(geom) AS geometry "
        f"FROM points {where}"
    )

    rows = await conn.fetch(sql, *params)

    features = []
    for row in rows:
        props = json.loads(row["props"]) if row["props"] else {}
        features.append(
            PointFeature(
                type="Feature",
                geometry=json.loads(row["geometry"]),
                properties=PointProperties(
                    id=row["id"],
                    layer_id=row["layer_id"],
                    name=row["name"],
                    **props,
                ),
            )
        )

    return PointFeatureCollection(type="FeatureCollection", features=features)