"""HCDP climate rasters (rainfall, temperature, SPI, ...). Each file is downloaded from the HCDP API once,
cleaned and kept on disk."""

import contextlib
import fcntl
import hashlib
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import numpy as np
import rasterio
import rasterio.shutil

import settings

HCDP_API = "https://api.hcdp.ikewai.org"

# Older cached files are downloaded again, so recent days HCDP revises are refreshed
MAX_AGE_SECONDS = 7 * 24 * 3600
# The cache folder is trimmed, oldest first, to stay under this
MAX_CACHE_BYTES = 2 * 1024**3
# What every cleaned file marks as empty
NODATA = -9999.0
# Lock and part files older than this, with no finished file, were left by a download that failed or was cut off
LEFTOVER_AGE_SECONDS = 3600
# Held by the one worker tidying the cache; not named *.lock, so the tidy-up never takes it for a leftover
TRIM_LOCK = ".trim-lock"


# HCDP has no file or dates for what was asked
class HcdpNotFound(Exception):
    pass


# HCDP refused or failed the request
class HcdpFailed(Exception):
    pass


# One request to the HCDP API with the key
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
        raise (HcdpNotFound if error.code == 404 else HcdpFailed)(f"HCDP: {message}")


# Writes the downloaded file as a cloud-optimised GeoTIFF whose empty pixels all hold NODATA.
# HCDP marks empty pixels as NaN, -9999 or about -3.4e38, not always the value the file declares.
def _save_cleaned(raw: bytes, path: Path) -> None:
    parts = [path.with_suffix(f".{step}.part") for step in ("raw", "clean", "cog")]
    raw_part, clean_part, cog_part = parts
    try:
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
    finally:
        for part in parts:
            part.unlink(missing_ok=True)


# Deletes files past their age, then the oldest until under the size limit, then download leftovers; one worker at a time
def _trim_cache() -> None:
    with open(settings.HCDP_CACHE_DIR / TRIM_LOCK, "w") as trim_lock:
        try:
            fcntl.flock(trim_lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return
        now = time.time()
        files = sorted(((f, f.stat()) for f in settings.HCDP_CACHE_DIR.glob("*.tif")), key=lambda item: item[1].st_mtime)
        total = sum(stat.st_size for _, stat in files)
        for f, stat in files:
            if now - stat.st_mtime > MAX_AGE_SECONDS or total > MAX_CACHE_BYTES:
                total -= stat.st_size
                f.unlink()
                f.with_suffix(".lock").unlink(missing_ok=True)
        for lock in settings.HCDP_CACHE_DIR.glob("*.lock"):
            if not lock.with_suffix(".tif").exists() and now - lock.stat().st_mtime > LEFTOVER_AGE_SECONDS:
                lock.unlink()
        # A part file can vanish here: the worker downloading it finishes and removes it
        for part in settings.HCDP_CACHE_DIR.glob("*.part"):
            with contextlib.suppress(FileNotFoundError):
                if now - part.stat().st_mtime > LEFTOVER_AGE_SECONDS:
                    part.unlink()


# The cleaned file for one HCDP selection and date, downloaded on first use. A lock file per download,
# so map panels asking at once, from any of the API's worker processes, download it once.
def cleaned_file(selection: dict[str, str], date: str) -> Path:
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
    return path


# The first and last date HCDP has for one selection
def available_dates(selection: dict[str, str]) -> list[str]:
    answer = json.loads(_hcdp_get("/datasets/date/range", selection))
    return list(answer.values()) if isinstance(answer, dict) else answer
