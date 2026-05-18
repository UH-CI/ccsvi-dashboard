import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter

router = APIRouter()

_CONFIG_PATH = (
    Path(__file__).parent.parent.parent.parent
    / "public"
    / "data"
    / "metrics"
    / "census_datasets_config.json"
)


@router.get("/api/v1/datasets")
async def get_datasets() -> dict[str, Any]:
    with open(_CONFIG_PATH) as f:
        return json.load(f)  # type: ignore[no-any-return]
