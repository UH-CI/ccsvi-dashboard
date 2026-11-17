"""HCDP climate rasters, served by TiTiler like the other rasters."""

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import Field
from titiler.core.dependencies import PreviewParams
from titiler.core.factory import TilerFactory

from ..colormaps import ColorMapParams
from ..hcdp_data import available_dates, cleaned_file

router = APIRouter(prefix="/api/v1/hcdp")

# The datasets the map offers, from each data type's list; each row is one data type and period, with its extra choices
CATALOG: list[dict] = [
    {"data_type": data_type["id"], **dataset}
    for data_type in json.loads(
        (Path(__file__).resolve().parents[3] / "config" / "hcdp_catalog.json").read_text()
    )["dataTypes"]
    for dataset in data_type["datasets"]
]
OPTION_KEYS = ("aggregation", "production", "timescale")


# The data type, period and extra choices of one catalog row; an unknown combination is a 404
def hcdp_selection(
    datatype: Annotated[str, Query(description="HCDP data type, e.g. 'rainfall'")],
    period: Annotated[str, Query(description="'day' or 'month'")],
    aggregation: Annotated[str | None, Query(description="e.g. 'mean' (temperature)")] = None,
    production: Annotated[str | None, Query(description="e.g. 'new' (rainfall)")] = None,
    timescale: Annotated[str | None, Query(description="e.g. 'timescale003' (SPI)")] = None,
) -> dict[str, str]:
    options = {"aggregation": aggregation, "production": production, "timescale": timescale}
    for row in CATALOG:
        if row["data_type"] == datatype and row["period"] == period and all(
            row.get(key) == options[key] for key in OPTION_KEYS
        ):
            chosen = {key: value for key, value in options.items() if value}
            return {"datatype": datatype, "period": period, **chosen}
    raise HTTPException(status_code=404, detail=f"No HCDP dataset for {datatype} / {period} {options}")


# The cleaned file's path, for TiTiler to read
def hcdp_path_dep(
    selection: Annotated[dict[str, str], Depends(hcdp_selection)],
    date: Annotated[str, Query(pattern=r"^\d{4}-\d{2}-\d{2}$", description="YYYY-MM-DD; a month's first day")],
) -> str:
    return str(cleaned_file(selection, date))


# Statistics from every pixel rather than a reduced copy, so the legend's min and max are exact.
# HCDP files are small (2288 x 1520), so reading all of them is quick.
@dataclass
class FullResolutionParams(PreviewParams):
    max_size: Annotated[int | None, Field(description="Maximum image size to read onto; all pixels by default")] = (
        None
    )

    # Keeps max_size even when it's None, which the reader takes as "no limit"; left out, it would use 1024
    def as_dict(self, exclude_none: bool = True) -> dict:
        return {**super().as_dict(exclude_none), "max_size": self.max_size}


# Same endpoints as /api/tiles/cog (tiles, statistics, statistics for a posted shape, info, point),
# with the HCDP selection and date in place of raster_id
hcdp = TilerFactory(
    path_dependency=hcdp_path_dep,
    colormap_dependency=ColorMapParams,
    img_preview_dependency=FullResolutionParams,
)


@router.get(
    "/date-range",
    response_model=list[str],
    summary="First and last date HCDP has for one dataset",
)
def hcdp_date_range(selection: Annotated[dict[str, str], Depends(hcdp_selection)]) -> list[str]:
    return available_dates(selection)
