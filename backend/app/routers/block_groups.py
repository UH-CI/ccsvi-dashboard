import csv
import io
import json
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request, Response
from pydantic import BaseModel, ConfigDict

from ..db import ConnDep

router = APIRouter()


# ── Pydantic models ──────────────────────────────────────────────────────────

class GeographyRecord(BaseModel):
    name: str | None
    block_group: str | None
    census_tract: str | None
    county: str | None


class MetricValueRecord(BaseModel):
    absolute: float | None
    margin_of_error: float | None
    percentage: float | None
    moe_percentage_points: float | None
    cv: float | None
    moe_derived: bool | None


class BlockGroupResult(BaseModel):
    # Metric columns come from metrics.mv_column and vary, so they arrive as extras
    model_config = ConfigDict(extra="allow")

    geoid: str
    name: str | None
    county: str | None
    population: int | None


# ── Column list for SELECT / CSV ──────────────────────────────────────────────

_BGM_ID_COLS = ["geoid", "name", "county", "population"]

# View metric columns from metrics.mv_column — also the allowlist for min_<col> params
async def metric_columns(conn) -> list[str]:
    rows = await conn.fetch(
        "SELECT mv_column FROM metrics WHERE mv_column IS NOT NULL"
        " ORDER BY dataset_id, display_order"
    )
    return [r["mv_column"] for r in rows]


# ── Endpoints ─────────────────────────────────────────────────────────────────

# DEPRECATED: replaced by /api/v1/geographies + /api/v1/metric-values (normalized schema).
# Reads from census_metrics table which is dropped by migrate_schema.py.
# @router.get("/api/v1/census-metrics")
# async def get_census_metrics(conn: ConnDep, response: Response) -> dict[str, Any]:
#     ...


@router.get(
    "/api/v1/geographies",
    response_model=dict[str, GeographyRecord],
    summary="Location metadata for all block groups / homelands",
)
async def get_geographies(conn: ConnDep, response: Response) -> dict[str, Any]:
    response.headers["Cache-Control"] = "public, max-age=86400"
    rows = await conn.fetch(
        "SELECT geoid, name, block_group, census_tract, county FROM geographies"
    )
    return {
        row["geoid"]: {
            "name": row["name"],
            "block_group": row["block_group"],
            "census_tract": row["census_tract"],
            "county": row["county"],
        }
        for row in rows
    }


@router.get(
    "/api/v1/metric-values",
    response_model=dict[str, MetricValueRecord],
    summary="Per-geoid values for one dataset + metric combination",
)
async def get_metric_values(
    conn: ConnDep,
    response: Response,
    dataset: str = Query(...),
    metric: str = Query(...),
) -> dict[str, Any]:
    response.headers["Cache-Control"] = "public, max-age=86400"
    rows = await conn.fetch(
        """
        SELECT mv.geoid,
               mv.absolute::float,
               mv.margin_of_error::float,
               mv.percentage::float,
               mv.moe_percentage_points::float,
               mv.cv::float,
               mv.moe_derived
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
            "moe_percentage_points": row["moe_percentage_points"],
            "cv": row["cv"],
            "moe_derived": row["moe_derived"],
        }
        for row in rows
    }


@router.get(
    "/api/v1/block-groups",
    response_model=list[BlockGroupResult],
    summary="Filter block groups by county, hazard, and metric thresholds",
    description=(
        "Returns block groups matching all specified filters. Supports county equality, "
        "a unioned hazard spatial join (ST_Intersects against the hazards table — a block "
        "group matches if it intersects ANY of the repeatable ?hazard=<id>[.<sub_id>] params), "
        "and numeric lower-bound thresholds on any block_group_metrics column via "
        "min_<col>=<value> query params. Use ?format=csv for a downloadable CSV attachment."
    ),
)
async def filter_block_groups(
    conn: ConnDep,
    request: Request,
    county: str | None = Query(None, description="Exact county name, e.g. 'Maui County'"),
    hazard: list[str] | None = Query(
        None,
        description="Hazard/sub-layer IDs, e.g. 'flood_hazard.Zone_AE'. Repeatable; unioned.",
    ),
    fmt: str = Query("json", alias="format", description="'json' or 'csv'"),
) -> Any:
    metric_cols = await metric_columns(conn)
    allowed_cols = frozenset(metric_cols)

    # Validate and collect min_<col> metric threshold params.
    metric_filters: list[tuple[str, float]] = []
    for key, val in request.query_params.multi_items():
        if not key.startswith("min_"):
            continue
        col = key[4:]
        if col not in allowed_cols:
            raise HTTPException(status_code=400, detail=f"Unknown metric column: {col!r}")
        try:
            metric_filters.append((col, float(val)))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid numeric value for {key!r}: {val!r}")

    # Build dynamic WHERE clause with asyncpg positional params ($1, $2, ...).
    conditions: list[str] = []
    params: list[Any] = []

    def add_cond(condition: str, val: Any) -> None:
        params.append(val)
        conditions.append(condition.replace("?", f"${len(params)}"))

    if county:
        add_cond("bgm.county = ?", county)

    if hazard:
        # One OR-branch per requested hazard/sub-layer, all inside a single
        # EXISTS — a block group matches if it intersects ANY of them.
        hazard_branches: list[str] = []
        hazard_params: list[Any] = []
        for entry in hazard:
            hazard_id, _, sub_id = entry.partition(".")
            base = len(params) + len(hazard_params) + 1
            if sub_id:
                hazard_branches.append(f"(h.hazard_id = ${base} AND h.sub_id = ${base + 1})")
                hazard_params.extend([hazard_id, sub_id])
            else:
                hazard_branches.append(f"(h.hazard_id = ${base})")
                hazard_params.append(hazard_id)
        exists_clause = (
            "EXISTS (SELECT 1 FROM hazards h WHERE ST_Intersects(bgm.geom, h.geom)"
            f" AND ({' OR '.join(hazard_branches)}))"
        )
        params.extend(hazard_params)
        conditions.append(exists_clause)

    for col, threshold in metric_filters:
        # col has been validated against allowed_cols — safe to interpolate.
        add_cond(f"bgm.{col} >= ?", threshold)

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    id_select = ", ".join(f"bgm.{c}" for c in _BGM_ID_COLS)
    metric_select = ", ".join(f"bgm.{c}::float" for c in metric_cols)
    sql = f"SELECT {id_select}, {metric_select} FROM block_group_metrics bgm {where}"

    async with conn.transaction():
        await conn.execute("SET LOCAL statement_timeout = '5s'")
        rows = await conn.fetch(sql, *params)

    if fmt == "csv":
        all_cols = _BGM_ID_COLS + metric_cols
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(all_cols)
        for row in rows:
            writer.writerow([row[c] for c in all_cols])
        return Response(
            content=buf.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="block_groups_filtered.csv"'},
        )

    return [dict(row) for row in rows]


# DEPRECATED: reads from census_metrics table (dropped by migrate_schema.py); not called by frontend.
# @router.get("/api/v1/block-groups/{geoid}")
# async def get_block_group(geoid: str, conn: ConnDep) -> dict[str, Any]:
#     ...