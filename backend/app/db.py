import os
from typing import Annotated, AsyncGenerator

import asyncpg
from fastapi import Depends

_pool: asyncpg.Pool | None = None


async def create_pool() -> None:
    global _pool
    _pool = await asyncpg.create_pool(os.environ["DATABASE_URL"])


async def close_pool() -> None:
    if _pool:
        await _pool.close()


async def get_conn() -> AsyncGenerator[asyncpg.Connection, None]:
    assert _pool is not None
    async with _pool.acquire() as conn:
        yield conn  # type: ignore[misc]


ConnDep = Annotated[asyncpg.Connection, Depends(get_conn)]