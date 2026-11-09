from typing import Annotated, AsyncGenerator

import asyncpg
from fastapi import Depends

import settings

_pool: asyncpg.Pool | None = None


# Any query running longer than 5 seconds is cancelled
async def create_pool() -> None:
    global _pool
    _pool = await asyncpg.create_pool(settings.database_url(), server_settings={"statement_timeout": "5000"})


async def close_pool() -> None:
    if _pool:
        await _pool.close()


async def get_conn() -> AsyncGenerator[asyncpg.Connection, None]:
    assert _pool is not None
    async with _pool.acquire() as conn:
        yield conn  # type: ignore[misc]


ConnDep = Annotated[asyncpg.Connection, Depends(get_conn)]