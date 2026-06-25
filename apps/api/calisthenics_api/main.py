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
from calisthenics_api.routes import (
    auth,
    feed,
    health,
    nodes,
    onboarding,
    progressions,
    seo,
    share,
    tendon_strain,
    trees,
    users,
    workouts,
)

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
    app.include_router(auth.router, prefix=settings.api_v1_prefix)
    app.include_router(users.router, prefix=settings.api_v1_prefix)
    app.include_router(onboarding.router, prefix=settings.api_v1_prefix)
    app.include_router(progressions.router, prefix=settings.api_v1_prefix)
    app.include_router(trees.router, prefix=settings.api_v1_prefix)
    app.include_router(nodes.router, prefix=settings.api_v1_prefix)
    app.include_router(workouts.router, prefix=settings.api_v1_prefix)
    app.include_router(tendon_strain.router, prefix=settings.api_v1_prefix)
    app.include_router(feed.router, prefix=settings.api_v1_prefix)
    app.include_router(share.router, prefix=settings.api_v1_prefix)

    # SEO endpoints (sitemap.xml + robots.txt) — mounted at ROOT (not
    # under /api/v1) so they're at the canonical /sitemap.xml and
    # /robots.txt URLs that Google + Bing expect. The Caddyfile in
    # apps/web/Caddyfile reverse-proxies /api/* but NOT these paths.
    # Note: this means they're served by the api container directly,
    # not via the web reverse-proxy. In production with Caddy fronting
    # the api, you'll need a path in /opt/traefik/dynamic/routers.yml
    # to route /sitemap.xml and /robots.txt to the api service.
    app.include_router(seo.router)

    return app


app = create_app()
