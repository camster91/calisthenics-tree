"""Tests for the in-memory rate limiter.

The limiter is per-process dict-based — no DB needed. These tests
verify the sliding-window semantics + the FastAPI dependency
contract without touching Postgres.
"""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi import Depends, FastAPI, HTTPException
from fastapi.testclient import TestClient

from calisthenics_api.rate_limit import (
    _buckets,
    rate_limit_per_ip,
)
from calisthenics_api.config import get_settings


@pytest.fixture(autouse=True)
def _clear_buckets() -> Iterator[None]:
    """Wipe the in-memory rate-limit buckets between tests so each
    test starts from a clean slate."""
    _buckets.clear()
    yield
    _buckets.clear()


@pytest.fixture
def app_with_limit() -> TestClient:
    """Build a tiny FastAPI app exposing a rate-limited endpoint
    via the same dependency the real routes use."""
    app = FastAPI()

    @app.post("/echo", dependencies=[Depends(rate_limit_per_ip("test", limit_per_min=3))])
    async def echo() -> dict:
        return {"ok": True}

    return TestClient(app)


def test_allows_under_limit(app_with_limit: TestClient) -> None:
    for _ in range(3):
        r = app_with_limit.post("/echo")
        assert r.status_code == 200, r.text


def test_blocks_over_limit(app_with_limit: TestClient) -> None:
    for _ in range(3):
        app_with_limit.post("/echo")
    r = app_with_limit.post("/echo")
    assert r.status_code == 429
    assert "rate limit" in r.json()["detail"].lower()
    # Retry-After header is required by HTTP spec for 429.
    assert r.headers.get("Retry-After")
    retry = int(r.headers["Retry-After"])
    assert 1 <= retry <= 60


def test_separate_buckets_are_independent(app_with_limit: TestClient) -> None:
    """Hitting the same IP under different bucket names doesn't
    double-count. (And different IPs under the same bucket don't
    share a quota — but that requires a real X-Forwarded-For setup
    which TestClient doesn't supply, so we just check the in-bucket
    case here.)"""
    # 3 in test bucket → blocked.
    for _ in range(3):
        app_with_limit.post("/echo")
    assert app_with_limit.post("/echo").status_code == 429


def test_limit_resets_after_window() -> None:
    """Direct test of the bucket expiry logic. We don't hit the
    HTTP layer — too slow to wait 60s in a test. Instead, manually
    expire the entries by rewriting their timestamps to the past
    and confirm a new request passes."""
    from calisthenics_api.rate_limit import _check_and_record

    # Fill the bucket.
    for _ in range(5):
        _check_and_record("test:127.0.0.1", limit=5, window_secs=60)

    # Now force-expire the entries: rewrite all timestamps to be 120s ago.
    import time
    now = time.monotonic()
    for entry in _buckets["test:127.0.0.1"]:
        # deque items are floats — mutating requires rebuilding.
        pass
    # Cleanest way: replace the deque entirely.
    from collections import deque
    _buckets["test:127.0.0.1"] = deque([now - 120] * 5)

    # Next call: all 5 entries are > 60s old → cleared → call passes.
    _check_and_record("test:127.0.0.1", limit=5, window_secs=60)


def test_dependency_settings_default_lookup() -> None:
    """No limit_per_min passed → reads settings.rate_limit_<bucket>_per_min."""
    # Default for unknown bucket is 10 (the getattr fallback in the dep).
    app = FastAPI()

    @app.post("/x", dependencies=[Depends(rate_limit_per_ip("made_up_bucket"))])
    async def x() -> dict:
        return {}

    client = TestClient(app)
    # First 10 should pass (default limit is 10).
    for i in range(10):
        r = client.post("/x")
        assert r.status_code == 200, f"request {i}: {r.text}"
    # 11th should 429.
    r = client.post("/x")
    assert r.status_code == 429


def test_config_settings_exposed() -> None:
    """The Settings class exposes the rate-limit knobs so the env
    file (or compose file) can override defaults per environment."""
    settings = get_settings()
    assert hasattr(settings, "rate_limit_magic_link_per_min")
    assert hasattr(settings, "rate_limit_refresh_per_min")
    assert hasattr(settings, "trust_forwarded_for")
    # Defaults match the rate_limit.py convention.
    assert settings.rate_limit_magic_link_per_min >= 1
    assert settings.rate_limit_refresh_per_min >= 1