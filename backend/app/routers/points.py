import json
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Query, Request
from pydantic import BaseModel, ConfigDict

from ..area_query import AreaType, QueryParams, area_conditions, touches_every_hazard
from ..db import ConnDep

router = APIRouter(prefix="/api/v1/points")


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


@router.get(
    "",
    response_model=PointFeatureCollection,
    summary="Query point features by layer, area, hazard and raster",
    description=(
        "Returns a GeoJSON FeatureCollection from the points table. "
        "Supports filtering by layer_id (exact match), "
        "area_type with min_<col>=<value> and max_<col>=<value> params (only points inside an "
        "area of that type within every range, the same areas /api/v1/geographies/filter "
        "returns), and hazard (only points inside every one of these hazards, where any chosen "
        "sub-layer of a hazard counts, looked up in the pre-computed point_hazards table; "
        "repeatable), and raster (only points with a real value in one of these rasters, looked "
        "up in the pre-computed point_raster_values table; repeatable, matches any of them; "
        "combined with hazard, a point must match both). All params are optional; omitting "
        "them all returns every point."
    ),
)
async def get_points(
    conn: ConnDep,
    request: Request,
    layer_id: Annotated[str | None, Query(description="Layer ID, e.g. 'hospitals'")] = None,
    area_type: Annotated[
        AreaType | None,
        Query(description="Only points inside an area of this type within every min_<col> and max_<col>"),
    ] = None,
    hazard: Annotated[
        list[str] | None,
        Query(description="Hazard/sub-layer IDs, e.g. 'flood_hazard.Zone_AE'. Only points inside every hazard; any chosen sub-layer of it counts"),
    ] = None,
    raster: Annotated[
        list[str] | None,
        Query(description="Raster layer IDs, e.g. 'stormSurge.inundation_category1'. Only points with a value in any of them"),
    ] = None,
) -> Any:
    conditions: list[str] = []
    params = QueryParams()

    if layer_id:
        conditions.append(f"points.layer_id = {params.bind(layer_id)}")

    if area_type:
        view, area_where, _ = await area_conditions(conn, request, area_type, params)
        areas = f"SELECT v.geoid FROM {view} v" + (f" WHERE {' AND '.join(area_where)}" if area_where else "")
        conditions.append(
            "EXISTS (SELECT 1 FROM point_geographies pg WHERE pg.point_id = points.id"
            f" AND pg.geoid IN ({areas}))"
        )

    if hazard:
        conditions += touches_every_hazard("point_hazards", "h.point_id = points.id", hazard, params)

    if raster:
        conditions.append(
            "EXISTS (SELECT 1 FROM point_raster_values r WHERE r.point_id = points.id"
            f" AND r.raster_id = ANY({params.bind(raster)}))"
        )

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    sql = (
        f"SELECT points.id, points.layer_id, points.name, points.props, "
        f"ST_AsGeoJSON(points.geom) AS geometry FROM points {where}"
    )

    rows = await conn.fetch(sql, *params)

    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": json.loads(row["geometry"]),
                "properties": {
                    **(json.loads(row["props"]) if row["props"] else {}),
                    "id": row["id"],
                    "layer_id": row["layer_id"],
                    "name": row["name"],
                },
            }
            for row in rows
        ],
    }


@router.get(
    "/by-geoid",
    response_model=dict[str, list[str]],
    summary="List one layer's point names, grouped by the block group / Hawaiian Homeland area they're in",
    description=(
        "Returns every geoid for the chosen area type paired with the names of that "
        "layer's points inside it (empty list if none). One request covers every "
        "area at once, for building a names column in a table."
    ),
)
async def get_points_by_geoid(
    conn: ConnDep,
    layer_id: Annotated[str, Query(description="Layer ID, e.g. 'hospitals'")],
    area_type: Annotated[AreaType, Query(description="'block_group' or 'hawaiian_homeland'")],
) -> dict[str, list[str]]:
    rows = await conn.fetch(
        """
        SELECT g.geoid, p.name
        FROM geographies g
        LEFT JOIN point_geographies pg ON pg.geoid = g.geoid
        LEFT JOIN points p ON p.id = pg.point_id AND p.layer_id = $1
        WHERE g.type = $2
        ORDER BY p.name
        """,
        layer_id,
        area_type,
    )

    result: dict[str, list[str]] = {}
    for row in rows:
        names = result.setdefault(row["geoid"], [])
        if row["name"] is not None:
            names.append(row["name"])
    return result