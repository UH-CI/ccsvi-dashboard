from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Request, Response
from titiler.core.factory import TilerFactory

import settings
from pipeline.check_layers import rasters

from ..caching import revalidated_json
from ..colormaps import COLORMAPS, ColorMapParams

router = APIRouter()

# Raster id -> COG file name, from config/layers/rasters.json. A sub-layer's id is "<parent id>.<sub id>"
RASTER_CATALOG: dict[str, str] = {raster.id: raster.file for raster in rasters()}


def raster_path_dep(
    raster_id: Annotated[
        str,
        Query(description="Composite raster layer ID (e.g. 'stormSurge.inundation_category1')"),
    ],
) -> str:
    """Resolve a logical raster ID to an absolute COG path for TiTiler/GDAL."""
    filename = RASTER_CATALOG.get(raster_id)
    if not filename:
        raise HTTPException(status_code=404, detail=f"Unknown raster_id: '{raster_id}'")
    return str(settings.RASTER_DIR / filename)


# TiTiler factory wired to the catalog resolver.
# Exposes (all accept ?raster_id= instead of ?url=):
#   GET /tiles/{z}/{x}/{y}.png  — PNG map tiles
#   GET /statistics              — band min/max (fast when COG has embedded stats)
#   GET /point/{lon},{lat}       — pixel value at coordinate (click-to-query)
cog = TilerFactory(path_dependency=raster_path_dep, colormap_dependency=ColorMapParams)


@router.get("/api/v1/rasters/colormap")
async def get_colormap(name: str, request: Request) -> Response:
    """Return the 256 RGBA entries for a named TiTiler/rio-tiler colormap."""
    try:
        cm = COLORMAPS.get(name)
    except Exception:
        raise HTTPException(status_code=404, detail=f"Unknown colormap: '{name}'")
    return revalidated_json(request, [[int(value) for value in rgba] for rgba in cm.values()])