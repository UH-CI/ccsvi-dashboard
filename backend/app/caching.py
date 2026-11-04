"""Browser caching for API answers that change when the database is rebuilt."""

import hashlib
import json
from typing import Any

from fastapi import Request, Response


# The answer as JSON, tagged with a fingerprint of its contents. The browser keeps it but asks
# before each reuse; when its copy has the same fingerprint it gets a short "unchanged" reply (304)
def revalidated_json(request: Request, data: Any) -> Response:
    body = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode()
    etag = f'"{hashlib.sha256(body).hexdigest()[:32]}"'
    headers = {"Cache-Control": "no-cache", "ETag": etag}
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers=headers)
    return Response(body, media_type="application/json", headers=headers)
