from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from titiler.core.errors import DEFAULT_STATUS_CODES, add_exception_handlers

from .caching import revalidate_data_answers
from .db import close_pool, create_pool
from .hcdp_data import HcdpFailed, HcdpNotFound
from .routers import datasets, geographies, hcdp, metrics, points, rasters


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    await create_pool()
    yield
    await close_pool()


app = FastAPI(title="CCSVI API", version="0.1.0", lifespan=lifespan)

# Added before CORS, which then wraps it and covers its "unchanged" replies too
app.middleware("http")(revalidate_data_answers)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://uh-ci.github.io", "http://128.171.215.85"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(datasets.router)
app.include_router(metrics.router)
app.include_router(geographies.router)
app.include_router(points.router)
app.include_router(rasters.router)
app.include_router(rasters.cog.router, prefix="/api/tiles/cog", tags=["COG"])
app.include_router(hcdp.router)
app.include_router(hcdp.hcdp.router, prefix="/api/tiles/hcdp", tags=["HCDP"])
add_exception_handlers(app, {**DEFAULT_STATUS_CODES, HcdpNotFound: 404, HcdpFailed: 502})


@app.get("/api/v1/health", response_model=dict[str, str])
async def health() -> dict[str, str]:
    return {"status": "ok"}
