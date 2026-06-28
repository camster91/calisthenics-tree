FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# System deps for asyncpg
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
RUN pip install --upgrade pip && pip install -e .

COPY calisthenics_api ./calisthenics_api
COPY alembic ./alembic
COPY alembic.ini ./

EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/healthz', timeout=3)" || exit 1

# Entrypoint: run alembic upgrade then uvicorn
CMD ["sh", "-c", "alembic upgrade head && uvicorn calisthenics_api.main:app --host 0.0.0.0 --port 8000"]


# Sprint 38 hardening YELLOW — run as non-root user with restricted capabilities.
# The python:3.12-slim image ships with a `uid 0` default; create a dedicated
# appuser and switch to it before the CMD runs. `cap_drop: [ALL]` is set at
# the compose layer (`docker-compose.prod.yml`), not here — Docker doesn't
# allow cap_drop in Dockerfile RUN, only in compose / run.
RUN groupadd --system --gid 1001 appuser \
    && useradd  --system --uid 1001 --gid appuser --home-dir /app --shell /sbin/nologin appuser \
    && chown -R appuser:appuser /app

USER appuser
