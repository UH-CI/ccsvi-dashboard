from typing import Any, Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..db import ConnDep

router = APIRouter()

# ── Pydantic models ──────────────────────────────────────────────────────────

class SearchResult(BaseModel):
    type: Literal["point", "block_group"]
    id: str
    layer_id: str | None
    name: str | None


# ── Endpoint ──────────────────────────────────────────────────────────────────

_VALID_TYPES = {"point", "block_group"}


@router.get(
    "/api/v1/search",
    response_model=list[SearchResult],
    summary="Full-text search across point features and block groups",
    description=(
        "Returns up to 20 results matching the query string across the points and "
        "geographies tables using plainto_tsquery. Use the types param to restrict "
        "to one table. Groundwork for search-to-zoom and MCP tool use; not wired "
        "to the filter UI in Phase 3."
    ),
)
async def search(
    conn: ConnDep,
    q: str = Query(..., min_length=1, description="Search term"),
    types: str = Query(
        "point,block_group",
        description="Comma-separated result types: 'point', 'block_group'",
    ),
) -> list[SearchResult]:
    type_set = {t.strip() for t in types.split(",")}
    invalid = type_set - _VALID_TYPES
    if invalid:
        raise HTTPException(status_code=400, detail=f"Unknown type(s): {invalid}")

    parts: list[str] = []

    if "point" in type_set:
        parts.append(
            "SELECT 'point' AS type, id::text AS id, layer_id, name "
            "FROM points "
            "WHERE to_tsvector('english', coalesce(name, '')) "
            "@@ plainto_tsquery('english', $1)"
        )

    if "block_group" in type_set:
        parts.append(
            "SELECT 'block_group' AS type, geoid AS id, NULL AS layer_id, name "
            "FROM geographies "
            "WHERE to_tsvector('english', coalesce(name, '')) "
            "@@ plainto_tsquery('english', $1)"
        )

    if not parts:
        return []

    sql = " UNION ALL ".join(parts) + " LIMIT 20"
    rows = await conn.fetch(sql, q)
    return [dict(row) for row in rows]