import csv
import io
import json
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request, Response
from pydantic import BaseModel

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


class BlockGroupResult(BaseModel):
    geoid: str
    name: str | None
    county: str | None
    population: int | None
    housing_pre_1990_pct_calc: float | None = None
    vehicles_aggregate_abs: float | None = None
    gender_male_pct: float | None = None
    gender_female_pct: float | None = None
    no_health_insurance_pct_calc: float | None = None
    no_computer_pct: float | None = None
    fpl_total_abs: float | None = None
    fpl_under_100_pct_calc: float | None = None
    fpl_under_150_pct_calc: float | None = None
    fpl_under_200_pct_calc: float | None = None
    fpl_below_100_abs: float | None = None
    fpl_100_to_149_abs: float | None = None
    no_internet_pct: float | None = None
    limited_english_total_pct_calc: float | None = None
    limited_english_spanish_pct: float | None = None
    limited_english_indo_european_pct: float | None = None
    limited_english_asian_pi_pct: float | None = None
    limited_english_other_pct: float | None = None
    living_alone_total_pct_calc: float | None = None
    living_alone_male_pct: float | None = None
    living_alone_female_pct: float | None = None
    females_under_5_pct_calc: float | None = None
    females_under_18_pct_calc: float | None = None
    females_over_65_pct_calc: float | None = None
    males_under_5_pct_calc: float | None = None
    males_under_18_pct_calc: float | None = None
    males_over_65_pct_calc: float | None = None
    group_quarters_total_abs: float | None = None
    group_quarters_correctional_abs: float | None = None
    group_quarters_juvenile_abs: float | None = None
    group_quarters_nursing_abs: float | None = None
    group_quarters_other_abs: float | None = None
    race_white_pct: float | None = None
    race_black_pct: float | None = None
    race_aian_pct: float | None = None
    race_asian_pct: float | None = None
    race_nhpi_pct: float | None = None
    race_other_pct: float | None = None
    race_two_or_more_pct: float | None = None
    tenure_renter_pct: float | None = None


# ── Column list for SELECT / CSV ──────────────────────────────────────────────

_BGM_ID_COLS = ["geoid", "name", "county", "population"]

_BGM_METRIC_COLS = [
    "housing_pre_1990_pct_calc",
    "vehicles_aggregate_abs",
    "gender_male_pct",
    "gender_female_pct",
    "no_health_insurance_pct_calc",
    "no_computer_pct",
    "fpl_total_abs",
    "fpl_under_100_pct_calc",
    "fpl_under_150_pct_calc",
    "fpl_under_200_pct_calc",
    "fpl_below_100_abs",
    "fpl_100_to_149_abs",
    "no_internet_pct",
    "limited_english_total_pct_calc",
    "limited_english_spanish_pct",
    "limited_english_indo_european_pct",
    "limited_english_asian_pi_pct",
    "limited_english_other_pct",
    "living_alone_total_pct_calc",
    "living_alone_male_pct",
    "living_alone_female_pct",
    "females_under_5_pct_calc",
    "females_under_18_pct_calc",
    "females_over_65_pct_calc",
    "males_under_5_pct_calc",
    "males_under_18_pct_calc",
    "males_over_65_pct_calc",
    "group_quarters_total_abs",
    "group_quarters_correctional_abs",
    "group_quarters_juvenile_abs",
    "group_quarters_nursing_abs",
    "group_quarters_other_abs",
    "race_white_pct",
    "race_black_pct",
    "race_aian_pct",
    "race_asian_pct",
    "race_nhpi_pct",
    "race_other_pct",
    "race_two_or_more_pct",
    "tenure_renter_pct",
]

_BGM_COLS = _BGM_ID_COLS + _BGM_METRIC_COLS

# Allowlist for min_<col> query params — prevents SQL injection via identifier
# interpolation. asyncpg can parameterize values ($1) but NOT column identifiers.
ALLOWED_METRIC_COLS: frozenset[str] = frozenset(_BGM_METRIC_COLS)


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
               mv.percentage::float
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


@router.get(
    "/api/v1/block-groups",
    response_model=list[BlockGroupResult],
    summary="Filter block groups by county, hazard, and metric thresholds",
    description=(
        "Returns block groups matching all specified filters. Supports county equality, "
        "hazard spatial join (ST_Intersects against the hazards table), and numeric "
        "lower-bound thresholds on any block_group_metrics column via min_<col>=<value> "
        "query params. Use ?format=csv for a downloadable CSV attachment."
    ),
)
async def filter_block_groups(
    conn: ConnDep,
    request: Request,
    county: str | None = Query(None, description="Exact county name, e.g. 'Maui County'"),
    hazard_id: str | None = Query(None, description="Hazard layer ID, e.g. 'floodHazard'"),
    sub_id: str | None = Query(None, description="Hazard sub-layer, e.g. 'AE'"),
    height_ft: float | None = Query(None, description="SLR height in feet (SLR layers only)"),
    fmt: str = Query("json", alias="format", description="'json' or 'csv'"),
) -> Any:
    # Validate and collect min_<col> metric threshold params.
    metric_filters: list[tuple[str, float]] = []
    for key, val in request.query_params.multi_items():
        if not key.startswith("min_"):
            continue
        col = key[4:]
        if col not in ALLOWED_METRIC_COLS:
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

    if hazard_id:
        # Built separately — the EXISTS subquery has up to 3 placeholders
        # with offsets that must be computed after the current params length.
        hazard_conds = ["h.hazard_id = $?"]
        hazard_params: list[Any] = [hazard_id]
        if sub_id:
            hazard_conds.append("h.sub_id = $?")
            hazard_params.append(sub_id)
        if height_ft is not None:
            hazard_conds.append("h.height_ft = $?")
            hazard_params.append(height_ft)
        base = len(params) + 1
        exists_clause = (
            f"EXISTS (SELECT 1 FROM hazards h WHERE ST_Intersects(bgm.geom, h.geom)"
            f" AND {' AND '.join(c.replace('$?', f'${base + i}') for i, c in enumerate(hazard_conds))})"
        )
        params.extend(hazard_params)
        conditions.append(exists_clause)

    for col, threshold in metric_filters:
        # col has been validated against ALLOWED_METRIC_COLS — safe to interpolate.
        add_cond(f"bgm.{col} >= ?", threshold)

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    id_select = ", ".join(f"bgm.{c}" for c in _BGM_ID_COLS)
    metric_select = ", ".join(f"bgm.{c}::float" for c in _BGM_METRIC_COLS)
    sql = f"SELECT {id_select}, {metric_select} FROM block_group_metrics bgm {where}"

    async with conn.transaction():
        await conn.execute("SET LOCAL statement_timeout = '5s'")
        rows = await conn.fetch(sql, *params)

    if fmt == "csv":
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(_BGM_COLS)
        for row in rows:
            writer.writerow([row[c] for c in _BGM_COLS])
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