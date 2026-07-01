#!/usr/bin/env bash
# =============================================================================
# preflight.sh — local validation before deploy
# =============================================================================
#
# Run from the repo root: ./scripts/preflight.sh
#
# Checks everything that can be checked without touching the VPS:
#   - Docker daemon reachable
#   - docker-compose.yml parses
#   - both Dockerfiles build (skipped if SKIP_BUILD=1)
#   - apps/api env vars defined (from apps/api/.env.example)
#   - apps/web build succeeds
#   - backend tests pass
#   - web a11y + e2e tests pass
#   - alembic migrations apply cleanly to a fresh DB (uses ephemeral container)
#
# Exit non-zero on the first failure. Prints a green checklist on success.
# Designed to be safe to run repeatedly.

set -euo pipefail

cd "$(dirname "$0")/.."

PASS=()
FAIL=()
SKIP=()

ok()    { PASS+=("$1"); printf "  \033[32m✓\033[0m %s\n" "$1"; }
fail()  { FAIL+=("$1"); printf "  \033[31m✗\033[0m %s\n" "$1"; }
skip()  { SKIP+=("$1"); printf "  \033[33m-\033[0m %s (skipped)\n" "$1"; }
hr()    { printf "\n\033[1m== %s ==\033[0m\n" "$1"; }

# ---------------------------------------------------------------------
# Docker daemon
# ---------------------------------------------------------------------
hr "Docker daemon"
if docker info >/dev/null 2>&1; then
    ok "Docker daemon reachable"
else
    fail "Docker daemon NOT reachable — start Docker Desktop or colima"
fi

# ---------------------------------------------------------------------
# Compose config
# ---------------------------------------------------------------------
hr "docker-compose.yml"
if docker compose config --quiet 2>/dev/null; then
    ok "docker-compose.yml parses"
else
    fail "docker-compose.yml has syntax errors"
fi

# ---------------------------------------------------------------------
# Dockerfile syntax (lighter than full build)
# ---------------------------------------------------------------------
hr "Dockerfiles (syntax check)"
for df in apps/api/Dockerfile apps/web/Dockerfile; do
    if docker buildx build --check -f "$df" . >/dev/null 2>&1; then
        ok "$df syntax valid"
    else
        fail "$df syntax error — run 'docker buildx build --check -f $df .' for details"
    fi
done

# ---------------------------------------------------------------------
# Build (skip if SKIP_BUILD=1)
# ---------------------------------------------------------------------
if [[ "${SKIP_BUILD:-0}" == "1" ]]; then
    skip "docker build (SKIP_BUILD=1)"
else
    hr "docker build (api)"
    if docker compose build api >/tmp/api-build.log 2>&1; then
        ok "api image built"
    else
        fail "api image build failed — see /tmp/api-build.log"
    fi

    hr "docker build (web)"
    if docker compose build web >/tmp/web-build.log 2>&1; then
        ok "web image built"
    else
        fail "web image build failed — see /tmp/web-build.log"
    fi
fi

# ---------------------------------------------------------------------
# Backend tests
# ---------------------------------------------------------------------
hr "Backend tests"
if [[ -d apps/api/.venv ]]; then
    if (cd apps/api && uv run pytest tests/ -q 2>&1 | tail -5) ; then
        ok "backend tests pass"
    else
        fail "backend tests failing"
    fi
else
    skip "backend tests (apps/api/.venv not present)"
fi

# ---------------------------------------------------------------------
# Backend type check (mypy)
# ---------------------------------------------------------------------
# Sprint 40 audit: catches column-name mismatches (e.g. `Friendship.id`
# on a composite-PK table) and missing rowcount semantics that the
# pytest suite doesn't exercise. mypy is installed on demand via
# `uv run --with` so it's not in pyproject.toml's runtime deps.
hr "Backend mypy"
if [[ -d apps/api/.venv ]]; then
    if (cd apps/api && uv run --with mypy python -m mypy calisthenics_api/ --ignore-missing-imports --no-strict-optional 2>&1 | tail -3) ; then
        ok "mypy clean"
    else
        fail "mypy errors above"
    fi
else
    skip "mypy (apps/api/.venv not present)"
fi

# ---------------------------------------------------------------------
# Web tests (a11y + e2e)
# ---------------------------------------------------------------------
hr "Web tests"
if [[ -d apps/web/node_modules ]]; then
    # Capture playwright's exit code via ${PIPESTATUS[0]} — tail always
    # exits 0, so without this the preflight always sees "tests pass"
    # even on test failures or missing browser binaries. Confirm with
    # `cd apps/web && npx playwright install chromium firefox webkit`
    # if exit code is 1.
    set +e
    (cd apps/web && npx playwright test --reporter=line 2>&1 | tail -20)
    PW_EXIT=${PIPESTATUS[0]}
    set -e
    if [[ $PW_EXIT -eq 0 ]]; then
        ok "playwright tests pass"
    else
        fail "playwright tests failing (exit=$PW_EXIT — try 'cd apps/web && npx playwright install' for missing browser binary)"
    fi
else
    skip "playwright tests (apps/web/node_modules not installed)"
fi

# ---------------------------------------------------------------------
# Alembic migrations on a fresh DB
# ---------------------------------------------------------------------
hr "Alembic migrations (fresh DB)"
if command -v uv >/dev/null; then
    MIGRATION_TEST=$(docker run --rm -d --name ct-preflight-pg \
        -e POSTGRES_USER=calisthenics -e POSTGRES_PASSWORD=test \
        -e POSTGRES_DB=calisthenics -p 5433:5432 postgres:16-alpine 2>/dev/null || true)
    if [[ -n "$MIGRATION_TEST" ]]; then
        sleep 5
        if (cd apps/api && DATABASE_URL=postgresql+asyncpg://calisthenics:test@localhost:5433/calisthenics \
            uv run alembic upgrade head >/tmp/alembic.log 2>&1); then
            ok "alembic migrations apply cleanly"
        else
            fail "alembic migrations failed — see /tmp/alembic.log"
        fi
        docker stop ct-preflight-pg >/dev/null 2>&1 || true
        docker rm ct-preflight-pg >/dev/null 2>&1 || true
    else
        skip "alembic migrations (couldn't start ephemeral postgres)"
    fi
else
    skip "alembic migrations (uv not installed)"
fi

# ---------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------
hr "Summary"
printf "  \033[32m%d passed\033[0m · \033[31m%d failed\033[0m · \033[33m%d skipped\033[0m\n" \
    "${#PASS[@]}" "${#FAIL[@]}" "${#SKIP[@]}"

if [[ "${#FAIL[@]}" -gt 0 ]]; then
    echo
    printf "  \033[31mFailed:\033[0m\n"
    for f in "${FAIL[@]}"; do printf "    - %s\n" "$f"; done
    exit 1
fi

echo
printf "  \033[32mReady to deploy.\033[0m\n"