"""Smoke test for the share-card route.

Per T39 design, /api/v1/share/{unlock_id}.png serves a pre-rendered PNG
from disk (default apps/web/public/share/). These tests do NOT render
PNGs on demand — they verify the route loads, validates the unlock_id,
returns the file with the right content-type, and 404s on missing files.

A 67-byte placeholder PNG at apps/web/public/share/example-tuck-front-lever-001.png
is committed so the happy path can be tested without running the full
render-share Playwright pipeline.
"""

from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from calisthenics_api.config import get_settings
from calisthenics_api.main import create_app

# The placeholder is committed to apps/web/public/share/. Resolve once and
# assert on real bytes so the test catches accidental truncation.
PLACEHOLDER_FILENAME = "example-tuck-front-lever-001.png"


def _expected_png_path() -> Path:
    return Path(get_settings().share_dir) / PLACEHOLDER_FILENAME


def test_module_imports():
    """The route module must import cleanly (catches typos in dependencies)."""
    from calisthenics_api.routes import share  # noqa: F401

    assert share.router is not None


def test_share_card_happy_path():
    """Existing placeholder PNG returns 200 with image/png and the file bytes."""
    app = create_app()
    with TestClient(app) as client:
        r = client.get(f"/api/v1/share/{PLACEHOLDER_FILENAME}")

    assert r.status_code == 200
    assert r.headers["content-type"] == "image/png"
    # Match the on-disk file size so a future truncate is caught.
    expected_bytes = _expected_png_path().read_bytes()
    assert r.content == expected_bytes
    assert len(r.content) == len(expected_bytes)
    # 24h cache so a render-once-serve-many pipeline pays off.
    assert "max-age=86400" in r.headers.get("cache-control", "")


def test_share_card_missing_returns_404_with_hint():
    """A missing PNG returns 404 with an actionable hint message."""
    app = create_app()
    with TestClient(app) as client:
        r = client.get("/api/v1/share/does-not-exist-12345.png")

    assert r.status_code == 404
    body = r.json()
    assert "does-not-exist-12345" in body["detail"]
    # The hint must point at the renderer command so on-call engineers
    # don't have to dig for it.
    assert "npm run share:render" in body["detail"]


def test_share_card_invalid_unlock_id_returns_400():
    """unlock_id with characters outside [a-z0-9-] or >64 chars returns 400."""
    app = create_app()
    with TestClient(app) as client:
        # Underscore is NOT in [a-z0-9-] (defense against fs-unsafe characters)
        r1 = client.get("/api/v1/share/with_underscore.png")
        # Uppercase is outside the allowed charset
        r2 = client.get("/api/v1/share/UPPER-CASE.png")
        # Too long — > 64 chars
        r3 = client.get(f"/api/v1/share/{'a' * 65}.png")
        # Dot would let attackers probe filesystem — must reject
        r4 = client.get("/api/v1/share/has.dot.png")

    for r in (r1, r2, r3, r4):
        assert r.status_code == 400, r.text
        assert r.json()["detail"] == "Invalid unlock_id format"


def test_share_card_route_registered_in_openapi():
    """The route is part of the v1 surface and shows up in /openapi.json."""
    app = create_app()
    with TestClient(app) as client:
        r = client.get("/openapi.json")

    assert r.status_code == 200
    spec = r.json()
    assert "/api/v1/share/{unlock_id}.png" in spec["paths"]
