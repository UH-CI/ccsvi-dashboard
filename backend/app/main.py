from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .db import close_pool, create_pool
from .routers import block_groups, datasets, metrics


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    await create_pool()
    yield
    await close_pool()


app = FastAPI(title="CCSVI API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://uh-ci.github.io", "http://128.171.215.85"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(datasets.router)
app.include_router(metrics.router)
app.include_router(block_groups.router)

# Stand-in for Caddy static file serving — replace with Caddy reverse proxy in production.
app.mount("/data", StaticFiles(directory="/home/exouser/ccsvi-data"), name="data")


@app.get("/api/v1/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
