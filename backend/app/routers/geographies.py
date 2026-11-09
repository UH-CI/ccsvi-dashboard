from typing import Annotated, Any

from fastapi import APIRouter, Query, Request, Response
from pydantic import BaseModel, ConfigDict

from ..area_query import QueryParams, area_conditions, hazard_branches, metric_columns
from ..caching import revalidated_json
from ..db import ConnDep
from ..request_params import read_minimums

router = APIRouter()


# ── Pydantic models ──────────────────────────────────────────────────────────

class GeographyRecord(BaseModel):
    name: str | None
    block_group: str | None
    census_tract: str | None
    county: str | None


class BlockGroupResult(BaseModel):
    # Metric columns come from metrics.mv_column and vary, so they arrive as extras
    model_config = ConfigDict(extra="allow")

    geoid: str
    name: str | None
    county: str | None
    population: int | None


class HawaiianHomelandResult(BaseModel):
    # Same as BlockGroupResult, but Homelands have no county
    model_config = ConfigDict(extra="allow")

    geoid: str
    name: str | None
    population: int | None


# ── Column list for SELECT ────────────────────────────────────────────────────

_BGM_ID_COLS = ["geoid", "name", "county", "population"]
_HHM_ID_COLS = ["geoid", "name", "population"]


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.get(
    "/api/v1/geographies",
    response_model=dict[str, GeographyRecord],
    summary="Location metadata for all block groups / homelands",
)
async def get_geographies(conn: ConnDep, request: Request) -> Response:
    rows = await conn.fetch(
        "SELECT geoid, name, block_group, census_tract, county FROM geographies"
    )
    return revalidated_json(request, {
        row["geoid"]: {
            "name": row["name"],
            "block_group": row["block_group"],
            "census_tract": row["census_tract"],
            "county": row["county"],
        }
        for row in rows
    })


@router.get(
    "/api/v1/block-groups",
    response_model=list[BlockGroupResult],
    summary="Filter block groups by hazard and metric thresholds",
    description=(
        "Returns block groups matching all specified filters. Supports "
        "a unioned hazard filter (looked up in the pre-computed geography_hazards table — a "
        "block group matches if it touches ANY of the repeatable ?hazard=<id>[.<sub_id>] params) "
        "and numeric lower-bound thresholds on any block_group_metrics column via "
        "min_<col>=<value> query params (ANDed together)."
    ),
)
async def filter_block_groups(
    conn: ConnDep,
    request: Request,
    hazard: Annotated[
        list[str] | None,
        Query(description="Hazard/sub-layer IDs, e.g. 'flood_hazard.Zone_AE'. Repeatable; unioned."),
    ] = None,
) -> Any:
    return await run_filter(conn, request, False, hazard)


@router.get(
    "/api/v1/hawaiian-homelands",
    response_model=list[HawaiianHomelandResult],
    summary="Filter Hawaiian Homelands by hazard and metric thresholds",
    description="Same as /api/v1/block-groups, but searches hawaiian_homeland_metrics.",
)
async def filter_hawaiian_homelands(
    conn: ConnDep,
    request: Request,
    hazard: Annotated[
        list[str] | None,
        Query(description="Hazard/sub-layer IDs, e.g. 'flood_hazard.Zone_AE'. Repeatable; unioned."),
    ] = None,
) -> Any:
    return await run_filter(conn, request, True, hazard)


@router.get(
    "/api/v1/hazard-areas",
    response_model=dict[str, list[str]],
    summary="Which block groups and Hawaiian Homelands touch each hazard layer",
    description=(
        "For each repeatable ?hazard=<id>[.<sub_id>], returns the geoids (block groups and "
        "Homelands together) that touch it, read from the pre-computed geography_hazards table. "
        "A hazard with no shapes loaded in the database is left out of the result, so an empty "
        "list means the layer is loaded but touches no area."
    ),
)
async def hazard_areas(
    conn: ConnDep,
    hazard: Annotated[list[str], Query(description="Hazard/sub-layer IDs, e.g. 'flood_hazard.Zone_AE'. Repeatable.")],
) -> dict[str, list[str]]:
    result: dict[str, list[str]] = {}
    for entry in hazard:
        params = QueryParams()
        branches = hazard_branches([entry], params)
        loaded = await conn.fetchval(f"SELECT EXISTS (SELECT 1 FROM hazards h WHERE {branches})", *params)
        if not loaded:
            continue
        rows = await conn.fetch(f"SELECT DISTINCT geoid FROM geography_hazards h WHERE {branches}", *params)
        result[entry] = [row["geoid"] for row in rows]
    return result


# Shared by both filter endpoints; homelands picks which view to search
async def run_filter(
    conn,
    request: Request,
    homelands: bool,
    hazard: list[str] | None,
) -> Any:
    metric_cols = await metric_columns(conn, homelands)
    params = QueryParams()
    view, conditions = area_conditions(homelands, read_minimums(request, metric_cols), params)

    if hazard:
        # An area matches if it touches any chosen hazard, read from the list worked out at rebuild time.
        conditions.append(
            "EXISTS (SELECT 1 FROM geography_hazards h WHERE h.geoid = v.geoid"
            f" AND ({hazard_branches(hazard, params)}))"
        )

    id_cols = _HHM_ID_COLS if homelands else _BGM_ID_COLS
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    id_select = ", ".join(f"v.{c}" for c in id_cols)
    metric_select = ", ".join(f"v.{c}::float" for c in metric_cols)
    sql = f"SELECT {id_select}, {metric_select} FROM {view} v {where}"

    rows = await conn.fetch(sql, *params)
    return [dict(row) for row in rows]
