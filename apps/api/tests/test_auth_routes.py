"""Tests for the magic-link + JWT auth flow (Phase 2).

Covers:
- POST /api/v1/auth/magic-link — dev-mode returns token + expires_at
- GET  /api/v1/auth/verify — consumes token, returns JWT pair + user
- POST /api/v1/auth/refresh — exchanges refresh token for fresh pair
- JWT verification — get_current_user accepts valid JWTs alongside the
  static dev bearer (regression coverage for Phase 2 wire-up)
- Magic-link signature/expire behavior
"""

from __future__ import annotations

import os
import time

import jwt
import pytest
from fastapi.testclient import TestClient

from calisthenics_api import security
from calisthenics_api.config import get_settings
from calisthenics_api.main import app

# All tests in this file need a live API (TestClient) + a live DB for verify/refresh
# paths (they look up or create users). Follow the same skip pattern as
# tests/test_api_routes.py — only run when DATABASE_URL is set.
DATABASE_URL = os.environ.get("DATABASE_URL", "")

pytestmark = pytest.mark.skipif(
    not DATABASE_URL,
    reason="DATABASE_URL not set; no DB for auth integration test",
)


# -----------------------------------------------------------------------------#
# Fixtures
# -----------------------------------------------------------------------------#


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def dev_token() -> str:
    """A freshly issued magic-link token for dev@example.com."""
    token, _exp = security.issue_magic_link_token("dev@example.com")
    return token


# -----------------------------------------------------------------------------#
# POST /api/v1/auth/magic-link
# -----------------------------------------------------------------------------#


def test_magic_link_returns_dev_token_in_dev_mode(client: TestClient) -> None:
    """When POSTMARK_TOKEN is unset, the response includes `dev_token` so
    local UIs don't have to scrape the API logs."""
    response = client.post(
        "/api/v1/auth/magic-link",
        json={"email": "alice@example.com"},
    )
    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "dev"
    assert body["dev_token"] is not None
    assert len(body["dev_token"]) > 20
    assert "expires_at" in body


def test_magic_link_rejects_invalid_email(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/magic-link",
        json={"email": "not-an-email"},
    )
    assert response.status_code == 422  # pydantic validation


def test_magic_link_normalizes_email_to_lowercase(client: TestClient) -> None:
    """The token payload should carry the lowercased email so verify matches."""
    response = client.post(
        "/api/v1/auth/magic-link",
        json={"email": "Alice@Example.COM"},
    )
    assert response.status_code == 202
    body = response.json()
    decoded_email = security.verify_magic_link_token(body["dev_token"])
    assert decoded_email == "alice@example.com"


def test_magic_link_email_does_not_leak_existence(client: TestClient) -> None:
    """Both registered and unknown emails should return the same 202 response
    shape — never reveal whether the email exists."""
    r1 = client.post("/api/v1/auth/magic-link", json={"email": "known@example.com"})
    r2 = client.post("/api/v1/auth/magic-link", json={"email": "stranger@example.com"})
    assert r1.status_code == r2.status_code == 202
    assert set(r1.json().keys()) == set(r2.json().keys())


# -----------------------------------------------------------------------------#
# GET /api/v1/auth/verify
# -----------------------------------------------------------------------------#


def test_verify_consumes_dev_token_and_issues_jwt(
    client: TestClient, dev_token: str
) -> None:
    response = client.get(f"/api/v1/auth/verify?token={dev_token}")
    assert response.status_code == 200
    body = response.json()

    assert "access_token" in body
    assert "refresh_token" in body
    assert "access_expires_at" in body
    assert "refresh_expires_at" in body
    assert body["user"]["email"] == "dev@example.com"
    assert "id" in body["user"]


def test_verify_returns_400_on_bad_signature(client: TestClient) -> None:
    response = client.get("/api/v1/auth/verify?token=tampered.invalid.signature")
    assert response.status_code == 400


def test_verify_replay_returns_400(client: TestClient, dev_token: str) -> None:
    """Sprint 38 hardening RED-6: a magic-link token must be single-use.

    First verify succeeds. Re-submitting the same token within the 15-min
    TTL must 400 out as 'token already used' (closes the replay window
    where an intercepted magic-link email could mint arbitrary JWT pairs).

    Requires DATABASE_URL (writes to `magic_link_consumed` table)."""
    import os

    if not os.environ.get("DATABASE_URL"):
        import pytest

        pytest.skip("DATABASE_URL not set; magic_link_consumed replay test needs DB")

    # First verify: succeeds, returns JWT pair.
    r1 = client.get(f"/api/v1/auth/verify?token={dev_token}")
    assert r1.status_code == 200, f"first verify should succeed, got {r1.text}"

    # Replay: same token, should 400.
    r2 = client.get(f"/api/v1/auth/verify?token={dev_token}")
    assert r2.status_code == 400
    assert "already used" in r2.json()["detail"].lower()


def test_verify_returns_400_on_missing_token(client: TestClient) -> None:
    response = client.get("/api/v1/auth/verify")
    assert response.status_code == 422


def test_verify_issued_access_token_is_valid_jwt(
    client: TestClient, dev_token: str
) -> None:
    """Round-trip: the access JWT we issue must decode with our secret."""
    response = client.get(f"/api/v1/auth/verify?token={dev_token}")
    access = response.json()["access_token"]

    settings = get_settings()
    claims = jwt.decode(
        access,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
    )
    assert claims["typ"] == "access"
    assert claims["email"] == "dev@example.com"
    assert "sub" in claims
    assert "jti" in claims


# -----------------------------------------------------------------------------#
# POST /api/v1/auth/refresh
# -----------------------------------------------------------------------------#


def test_refresh_exchanges_refresh_token_for_new_pair(client: TestClient) -> None:
    verify_resp = client.get(
        "/api/v1/auth/verify?token=" + security.issue_magic_link_token("refresh@example.com")[0]
    )
    refresh = verify_resp.json()["refresh_token"]
    old_access = verify_resp.json()["access_token"]

    time.sleep(1)  # ensure new iat differs

    refresh_resp = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh},
    )
    assert refresh_resp.status_code == 200
    new_body = refresh_resp.json()
    assert new_body["access_token"] != old_access  # rotated
    assert "refresh_token" in new_body


def test_refresh_rejects_access_token_used_as_refresh(client: TestClient) -> None:
    """An access token must NOT be accepted by the refresh endpoint."""
    verify_resp = client.get(
        "/api/v1/auth/verify?token=" + security.issue_magic_link_token("typ@example.com")[0]
    )
    access = verify_resp.json()["access_token"]

    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": access},
    )
    assert response.status_code == 401


def test_refresh_rejects_garbage_token(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "not.a.jwt"},
    )
    assert response.status_code == 401


# -----------------------------------------------------------------------------#
# JWT verification in get_current_user (regression coverage)
# -----------------------------------------------------------------------------#


def test_protected_route_accepts_jwt(client: TestClient, dev_token: str) -> None:
    """A route that requires auth (progressions) must accept the JWT
    issued by /auth/verify."""
    verify = client.get(f"/api/v1/auth/verify?token={dev_token}")
    access = verify.json()["access_token"]

    # This route requires the bearer token. With JWT support, the JWT must
    # also work — same shape, same downstream effect.
    response = client.get(
        "/api/v1/users/me/progressions",
        headers={"Authorization": f"Bearer {access}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["user_id"].startswith("usr_")


def test_protected_route_rejects_expired_jwt(client: TestClient, dev_token: str) -> None:
    """An expired access JWT should yield 401 (covers the ExpiredSignatureError
    branch in security.decode_jwt)."""
    settings = get_settings()
    expired = jwt.encode(
        {
            "sub": "00000000-0000-0000-0000-000000000000",
            "email": "x@example.com",
            "typ": "access",
            "iat": int(time.time()) - 7200,
            "exp": int(time.time()) - 3600,  # 1h ago
            "jti": "test",
        },
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    response = client.get(
        "/api/v1/users/me/progressions",
        headers={"Authorization": f"Bearer {expired}"},
    )
    assert response.status_code == 401


# -----------------------------------------------------------------------------#
# Security helpers (unit tests, no DB)
# -----------------------------------------------------------------------------#


def test_magic_link_token_roundtrip() -> None:
    token, exp = security.issue_magic_link_token("roundtrip@example.com")
    decoded = security.verify_magic_link_token(token)
    assert decoded == "roundtrip@example.com"
    assert exp > __import__("datetime").datetime.now(__import__("datetime").timezone.utc)


def test_security_decode_rejects_wrong_typ() -> None:
    settings = get_settings()
    refresh = jwt.encode(
        {
            "sub": "abc",
            "email": "x@x.com",
            "typ": "refresh",
            "iat": int(time.time()),
            "exp": int(time.time()) + 3600,
            "jti": "test",
        },
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    with pytest.raises(ValueError, match="Wrong token type"):
        security.decode_jwt(refresh, expected_typ="access")