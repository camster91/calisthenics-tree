"""FastAPI app entrypoint.

Routes are mounted under settings.api_v1_prefix. The /healthz route
is registered at the root for liveness probes (no auth, no prefix).
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from calisthenics_api import __version__
from calisthenics_api.config import get_settings
from calisthenics_api.db import dispose_engine
from calisthenics_api.routes import health, onboarding, progressions, share, workouts

logger = logging.getLogger("calisthenics_api")
logger.setLevel(logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info("Starting calisthenics_api %s (env=%s)", __version__, settings.environment)
    yield
    await dispose_engine()
    logger.info("calisthenics_api shutdown complete")


def create_app() -> FastAPI:
    settings = get_settings()

    # Sentry error tracking — only initialised when DSN is set, so cold-start
    # stays fast in environments without observability (local dev, tests).
    if settings.sentry_dsn:
        import sentry_sdk

        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=settings.environment,
            release=f"calisthenics-api@{__version__}",
            traces_sample_rate=0.1,  # 10% of requests traced; bump later
        )

    app = FastAPI(
        title="Calisthenics Platform API",
        version=__version__,
        description=(
            "Phase 1 backend: DAG-based progression engine, placement algorithm, "
            "tendon strain calculator, and the 3 spec endpoints."
        ),
        lifespan=lifespan,
    )

    # Health (no auth, no prefix)
    app.include_router(health.router)

    # /api/v1
    app.include_router(onboarding.router, prefix=settings.api_v1_prefix)
    app.include_router(progressions.router, prefix=settings.api_v1_prefix)
    app.include_router(workouts.router, prefix=settings.api_v1_prefix)
    app.include_router(share.router, prefix=settings.api_v1_prefix)

    return app


app = create_app()
