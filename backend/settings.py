"""Where the data lives on the VM, and the database address. Every backend part reads them from here.

The data root and version are set in settings.conf, which backend/scripts/env.sh also reads.
"""

import os
from pathlib import Path


def _read_settings_file() -> dict[str, str]:
    lines = Path(__file__).with_name("settings.conf").read_text().splitlines()
    pairs = [line.split("=", 1) for line in lines if line.strip() and not line.startswith("#")]
    return {key: value for key, value in pairs}


_SETTINGS = _read_settings_file()

DATA_ROOT = Path(_SETTINGS["DATA_ROOT"])
DATA_VERSION = _SETTINGS["DATA_VERSION"]
DATA_DIR = DATA_ROOT / DATA_VERSION
RAW_DIR = DATA_ROOT / "archived" / "raw_files"

RASTER_DIR = DATA_DIR / "rasters"
HAZARD_GEOJSON_DIR = DATA_DIR / "hazards_geojson"
HAZARD_TILES_DIR = DATA_DIR / "hazards"
POINT_DATA_DIR = DATA_DIR / "point_data"
REPORT_DIR = DATA_DIR / "reports"

CENSUS_RAW_DIR = RAW_DIR / "census_raw"
CENSUS_NOTES_XLSX = RAW_DIR / "metrics" / "JPL_CCSVI_all_fields.xlsx"
CENSUS_CLEANED_DIR = DATA_ROOT / "archived" / "cleaned-data"


# The database address, read when connecting so tools that only use folders don't need it
def database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise SystemExit(
            "DATABASE_URL is not set. On the VM, run this through backend/scripts/ "
            "(env.sh loads it from the repo .env), or: export $(sudo cat /etc/ccsvi-api.env | xargs)"
        )
    return url
