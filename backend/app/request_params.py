"""Settings read from web requests and shared by more than one route."""

from fastapi import HTTPException, Request


# Each min_<col> setting as (column, minimum). Only columns in allowed_cols get through, so they're safe to put in SQL
def read_minimums(request: Request, allowed_cols: list[str]) -> list[tuple[str, float]]:
    minimums: list[tuple[str, float]] = []
    for key, val in request.query_params.multi_items():
        if not key.startswith("min_"):
            continue
        col = key[4:]
        if col not in allowed_cols:
            raise HTTPException(status_code=400, detail=f"Unknown metric column: {col!r}")
        try:
            minimums.append((col, float(val)))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid numeric value for {key!r}: {val!r}")
    return minimums
