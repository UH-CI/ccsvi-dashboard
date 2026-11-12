"""Query-building shared by the routes that look up areas and points."""

from typing import Any, Literal

from fastapi import Request

from .request_params import read_ranges

# The kinds of area, as geographies.type holds them
AreaType = Literal["block_group", "hawaiian_homeland"]

AREA_VIEWS: dict[AreaType, str] = {
    "block_group": "block_group_metrics",
    "hawaiian_homeland": "hawaiian_homeland_metrics",
}


# The values of one query. bind() stores a value and gives the $n that refers to it
class QueryParams(list):
    def bind(self, value: Any) -> str:
        self.append(value)
        return f"${len(self)}"


# The view's filter columns, each named by its metric key: its only decimal-number columns. Also the allowlist for min_<col> and max_<col>
async def metric_columns(conn, area_type: AreaType) -> list[str]:
    rows = await conn.fetch(
        "SELECT attname FROM pg_attribute"
        " WHERE attrelid = $1::regclass AND attnum > 0 AND NOT attisdropped AND atttypid = 'numeric'::regtype"
        " ORDER BY attnum",
        AREA_VIEWS[area_type],
    )
    return [r["attname"] for r in rows]


# A layer id "<parent>" or "<parent>.<sub>" as (parent, sub or ""); parent ids never contain a dot, so split at the first
def split_layer_id(layer_id: str) -> tuple[str, str]:
    parent, _, sub = layer_id.partition(".")
    return parent, sub


# Matches table h's rows for any of these hazard layers and sub-layers
def hazard_branches(entries: list[str], params: QueryParams) -> str:
    branches: list[str] = []
    for entry in entries:
        hazard_id, sub_id = split_layer_id(entry)
        if sub_id:
            branches.append(f"(h.hazard_id = {params.bind(hazard_id)} AND h.sub_id = {params.bind(sub_id)})")
        else:
            branches.append(f"(h.hazard_id = {params.bind(hazard_id)})")
    return " OR ".join(branches)


# One condition per chosen hazard: the area or point that link ties table h to touches any of that hazard's chosen sub-layers
def touches_every_hazard(table: str, link: str, entries: list[str], params: QueryParams) -> list[str]:
    by_hazard: dict[str, list[str]] = {}
    for entry in entries:
        by_hazard.setdefault(split_layer_id(entry)[0], []).append(entry)
    return [
        f"EXISTS (SELECT 1 FROM {table} h WHERE {link} AND ({hazard_branches(group, params)}))"
        for group in by_hazard.values()
    ]


# The view of block groups or Homelands, the WHERE conditions keeping the areas within the request's
# min_<col> and max_<col> ranges, and the view's filter columns
async def area_conditions(
    conn,
    request: Request,
    area_type: AreaType,
    params: QueryParams,
) -> tuple[str, list[str], list[str]]:
    columns = await metric_columns(conn, area_type)
    conditions = [f"v.{col} {operator} {params.bind(value)}" for col, operator, value in read_ranges(request, columns)]
    return AREA_VIEWS[area_type], conditions, columns
