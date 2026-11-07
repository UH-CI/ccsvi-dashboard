"""HCDP climate rasters (rainfall, temperature, SPI, ...). Each file is downloaded from the HCDP API once,
cleaned and kept on disk, then served by TiTiler like the other rasters."""

import fcntl
import hashlib
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Annotated

import numpy as np
import rasterio
import rasterio.shutil
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import Field
from titiler.core.dependencies import PreviewParams
from titiler.core.factory import TilerFactory

import settings

from ..colormaps import ColorMapParams

router = APIRouter()

HCDP_API = "https://api.hcdp.ikewai.org"

# The datasets the map offers; each row is one data type and period, with its extra choices
CATALOG: list[dict] = json.loads(
    (Path(__file__).resolve().parents[3] / "config" / "hcdp_catalog.json").read_text()
)
OPTION_KEYS = ("aggregation", "production", "timescale")

# Older cached files are downloaded again, so recent days HCDP revises are refreshed
MAX_AGE_SECONDS = 7 * 24 * 3600
# The cache folder is trimmed, oldest first, to stay under this
MAX_CACHE_BYTES = 2 * 1024**3
# What every cleaned file marks as empty
NODATA = -9999.0


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


# One request to the HCDP API with the key; HCDP's "not found" becomes a 404, any other failure a 502
def _hcdp_get(path: str, params: dict[str, str]) -> bytes:
    token, email = settings.hcdp_credentials()
    request = urllib.request.Request(
        f"{HCDP_API}{path}?{urllib.parse.urlencode(params)}",
        headers={"Authorization": f"Bearer {token}", "User-Agent": email},
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        message = error.read().decode(errors="replace")[:300] or str(error.reason)
        raise HTTPException(status_code=404 if error.code == 404 else 502, detail=f"HCDP: {message}")


# Writes the downloaded file as a cloud-optimised GeoTIFF whose empty pixels all hold NODATA.
# HCDP marks empty pixels as NaN, -9999 or about -3.4e38, not always the value the file declares.
def _save_cleaned(raw: bytes, path: Path) -> None:
    raw_part = path.with_suffix(".raw.part")
    clean_part = path.with_suffix(".clean.part")
    cog_part = path.with_suffix(".cog.part")
    raw_part.write_bytes(raw)
    with rasterio.open(raw_part) as src:
        band = src.read(1).astype("float32")
        empty = np.isnan(band) | (band == -9999) | (band <= -3.0e38)
        if src.nodata is not None:
            empty |= band == src.nodata
        band[empty] = NODATA
        profile = src.profile | {"driver": "GTiff", "dtype": "float32", "nodata": NODATA, "compress": "deflate"}
    with rasterio.open(clean_part, "w", **profile) as dst:
        dst.write(band, 1)
    rasterio.shutil.copy(
        clean_part, cog_part, driver="COG", compress="DEFLATE", blocksize=512, overview_resampling="average"
    )
    os.replace(cog_part, path)
    raw_part.unlink()
    clean_part.unlink()


# Deletes files past their age, then the oldest until the folder is under its size limit, and lock files
# left by downloads that failed (no file, over an hour old)
def _trim_cache() -> None:
    files = sorted(settings.HCDP_CACHE_DIR.glob("*.tif"), key=lambda f: f.stat().st_mtime)
    total = sum(f.stat().st_size for f in files)
    now = time.time()
    for f in files:
        if now - f.stat().st_mtime > MAX_AGE_SECONDS or total > MAX_CACHE_BYTES:
            total -= f.stat().st_size
            f.unlink()
            f.with_suffix(".lock").unlink(missing_ok=True)
    for lock in settings.HCDP_CACHE_DIR.glob("*.lock"):
        if not lock.with_suffix(".tif").exists() and now - lock.stat().st_mtime > 3600:
            lock.unlink(missing_ok=True)


# The cleaned file for one HCDP selection and date, downloaded on first use. A lock file per download,
# so map panels asking at once, from any of the API's worker processes, download it once.
def hcdp_path_dep(
    selection: Annotated[dict[str, str], Depends(hcdp_selection)],
    date: Annotated[str, Query(pattern=r"^\d{4}-\d{2}-\d{2}$", description="YYYY-MM-DD; a month's first day")],
) -> str:
    params = {**selection, "date": date, "extent": "statewide"}
    digest = hashlib.sha1(json.dumps(params, sort_keys=True).encode()).hexdigest()[:10]
    path = settings.HCDP_CACHE_DIR / f"{selection['datatype']}_{selection['period']}_{date}_{digest}.tif"

    def is_fresh() -> bool:
        return path.exists() and time.time() - path.stat().st_mtime < MAX_AGE_SECONDS

    if not is_fresh():
        settings.HCDP_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        with open(path.with_suffix(".lock"), "w") as lock_file:
            fcntl.flock(lock_file, fcntl.LOCK_EX)
            if not is_fresh():
                _save_cleaned(_hcdp_get("/raster", params), path)
                _trim_cache()
    return str(path)


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
    "/api/v1/hcdp/date-range",
    response_model=list[str],
    summary="First and last date HCDP has for one dataset",
)
def hcdp_date_range(selection: Annotated[dict[str, str], Depends(hcdp_selection)]) -> list[str]:
    answer = json.loads(_hcdp_get("/datasets/date/range", selection))
    return list(answer.values()) if isinstance(answer, dict) else answer
