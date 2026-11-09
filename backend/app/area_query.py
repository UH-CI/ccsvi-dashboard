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


# View metric columns from metrics.mv_column — also the allowlist for min_<col> params
async def metric_columns(conn, area_type: AreaType) -> list[str]:
    rows = await conn.fetch(
        "SELECT m.mv_column FROM metrics m JOIN datasets d ON d.id = m.dataset_id"
        " WHERE m.mv_column IS NOT NULL AND d.hawaiian_homelands = $1"
        " ORDER BY m.dataset_id, m.display_order",
        area_type == "hawaiian_homeland",
    )
    return [r["mv_column"] for r in rows]


# Parses hazard layers and sub-layer requests
def hazard_branches(entries: list[str], params: QueryParams) -> str:
    branches: list[str] = []
    for entry in entries:
        hazard_id, _, sub_id = entry.partition(".")
        if sub_id:
            branches.append(f"(h.hazard_id = {params.bind(hazard_id)} AND h.sub_id = {params.bind(sub_id)})")
        else:
            branches.append(f"(h.hazard_id = {params.bind(hazard_id)})")
    return " OR ".join(branches)


# The view of block groups or Homelands, and the WHERE conditions keeping the areas at or above each minimum
def area_conditions(
    area_type: AreaType,
    minimums: list[tuple[str, float]],
    params: QueryParams,
) -> tuple[str, list[str]]:
    return AREA_VIEWS[area_type], [f"v.{col} >= {params.bind(minimum)}" for col, minimum in minimums]
