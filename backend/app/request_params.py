"""Settings read from web requests and shared by more than one route."""

from fastapi import HTTPException, Request


# The SQL comparison for each kind of bound: min_<col> is at or above, max_<col> at or below
BOUND_OPERATORS = {"min_": ">=", "max_": "<="}


# Each min_<col> and max_<col> as (column, operator, value). Only allowed_cols get through, so they're safe in SQL
def read_ranges(request: Request, allowed_cols: list[str]) -> list[tuple[str, str, float]]:
    bounds: list[tuple[str, str, float]] = []
    for key, val in request.query_params.multi_items():
        operator = BOUND_OPERATORS.get(key[:4])
        if operator is None:
            continue
        col = key[4:]
        if col not in allowed_cols:
            raise HTTPException(status_code=400, detail=f"Unknown metric column: {col!r}")
        try:
            bounds.append((col, operator, float(val)))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid numeric value for {key!r}: {val!r}")
    return bounds
