"""How the API's data answers are sent: compressed, and fingerprinted so the browser can reuse its copy."""

import gzip
import hashlib

from fastapi import Request, Response
from starlette.middleware.base import RequestResponseEndpoint

# Answers smaller than this aren't worth compressing
MIN_COMPRESS_BYTES = 1000


# Tags each successful data answer with a fingerprint of its contents. The browser keeps it but asks
# before each reuse; when its copy has the same fingerprint it gets a short "unchanged" reply (304).
# Otherwise the answer is sent compressed when the browser accepts that.
async def compress_and_tag_data_answers(request: Request, call_next: RequestResponseEndpoint) -> Response:
    response = await call_next(request)
    if request.method != "GET" or not request.url.path.startswith("/api/v1/") or response.status_code != 200:
        return response
    body = b"".join([chunk async for chunk in response.body_iterator])
    etag = f'"{hashlib.sha256(body).hexdigest()[:32]}"'
    headers = {"cache-control": "no-cache", "etag": etag, "vary": "accept-encoding"}
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers=headers)
    if len(body) >= MIN_COMPRESS_BYTES and "gzip" in request.headers.get("accept-encoding", ""):
        body = gzip.compress(body, compresslevel=6)
        headers["content-encoding"] = "gzip"
    return Response(body, headers={**response.headers, **headers, "content-length": str(len(body))})
