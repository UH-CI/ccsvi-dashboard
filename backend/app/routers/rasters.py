from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response
from rio_tiler.colormap import cmap as colormap_registry
from titiler.core.factory import TilerFactory

router = APIRouter()

RASTER_DIR = Path("/home/exouser/ccsvi-data/v05-2026/rasters")

# Maps composite layer IDs (matching the frontend store convention) to COG filenames.
# Convention: top-level layers use their id (e.g. "Landslide");
# sub-layers use "parentId.subId" (e.g. "stormSurge.inundation_category1").
# Add new raster layers here
RASTER_CATALOG: dict[str, str] = {
    "stormSurge.inundation_category1": "Hawaii_Category1_MOM_Inundation_HighTide.cog.tif",
    "stormSurge.inundation_category2": "Hawaii_Category2_MOM_Inundation_HighTide.cog.tif",
    "stormSurge.inundation_category3": "Hawaii_Category3_MOM_Inundation_HighTide.cog.tif",
    "stormSurge.inundation_category4": "Hawaii_Category4_MOM_Inundation_HighTide.cog.tif",
    "Landslide": "lw_hi.cog.tif",
}


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
    return str(RASTER_DIR / filename)


# TiTiler factory wired to the catalog resolver.
# Exposes (all accept ?raster_id= instead of ?url=):
#   GET /tiles/{z}/{x}/{y}.png  — PNG map tiles
#   GET /statistics              — band min/max (fast when COG has embedded stats)
#   GET /point/{lon},{lat}       — pixel value at coordinate (click-to-query)
cog = TilerFactory(path_dependency=raster_path_dep)


@router.get("/api/tiles/cog/file")
async def get_raster_file(
    raster_id: Annotated[
        str,
        Query(description="Composite raster layer ID (e.g. 'stormSurge.inundation_category1')"),
    ],
    response: Response,
) -> Response:
    """Return the full COG bytes for a raster layer so the client can compute zonal statistics."""
    file_path = Path(raster_path_dep(raster_id))
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Raster file not found for '{raster_id}'")

    response.headers["Cache-Control"] = "public, max-age=86400"
    response.headers["Content-Disposition"] = f'attachment; filename="{file_path.name}"'
    return Response(content=file_path.read_bytes(), media_type="application/octet-stream")


@router.get("/api/v1/rasters")
async def list_rasters(response: Response) -> dict[str, list[str]]:
    """Return the catalog of available raster layer IDs."""
    response.headers["Cache-Control"] = "public, max-age=86400"
    return {"rasterIds": list(RASTER_CATALOG.keys())}


@router.get("/api/v1/rasters/colormap")
async def get_colormap(name: str, response: Response) -> list[list[int]]:
    """Return the 256 RGBA entries for a named TiTiler/rio-tiler colormap."""
    try:
        cm = colormap_registry.get(name)
    except Exception:
        raise HTTPException(status_code=404, detail=f"Unknown colormap: '{name}'")
    response.headers["Cache-Control"] = "public, max-age=86400"
    return list(cm.values())