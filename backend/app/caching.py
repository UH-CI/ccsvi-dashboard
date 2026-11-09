"""Browser caching for the API's data answers."""

import hashlib

from fastapi import Request, Response
from starlette.middleware.base import RequestResponseEndpoint


# Tags each successful data answer with a fingerprint of its contents. The browser keeps it but asks
# before each reuse; when its copy has the same fingerprint it gets a short "unchanged" reply (304)
async def revalidate_data_answers(request: Request, call_next: RequestResponseEndpoint) -> Response:
    response = await call_next(request)
    if request.method != "GET" or not request.url.path.startswith("/api/v1/") or response.status_code != 200:
        return response
    body = b"".join([chunk async for chunk in response.body_iterator])
    etag = f'"{hashlib.sha256(body).hexdigest()[:32]}"'
    headers = {"cache-control": "no-cache", "etag": etag}
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers=headers)
    return Response(body, headers={**response.headers, **headers})
