"""Query-building shared by the routes that look up areas and points."""

from typing import Any, Literal

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


# View metric columns from metrics.mv_column — also the allowlist for min_<col> and max_<col> params
async def metric_columns(conn, area_type: AreaType) -> list[str]:
    rows = await conn.fetch(
        "SELECT m.mv_column FROM metrics m JOIN datasets d ON d.id = m.dataset_id"
        " WHERE m.mv_column IS NOT NULL AND d.hawaiian_homelands = $1"
        " ORDER BY m.dataset_id, m.display_order",
        area_type == "hawaiian_homeland",
    )
    return [r["mv_column"] for r in rows]


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


# The view of block groups or Homelands, and the WHERE conditions keeping the areas within each column's range
def area_conditions(
    area_type: AreaType,
    bounds: list[tuple[str, str, float]],
    params: QueryParams,
) -> tuple[str, list[str]]:
    return AREA_VIEWS[area_type], [f"v.{col} {operator} {params.bind(value)}" for col, operator, value in bounds]
