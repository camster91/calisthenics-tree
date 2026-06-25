"""GET /healthz — liveness probe, no auth."""

from __future__ import annotations

from fastapi import APIRouter

from calisthenics_api import __version__
from calisthenics_api.config import get_settings
from calisthenics_api.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/healthz", response_model=HealthResponse)
async def healthz() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(status="ok", version=__version__, environment=settings.environment)
