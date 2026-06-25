"""Tests for the billing/paywall scaffold (P5).

Pure unit tests run without a DB. Integration tests (those that hit
the real TestClient + DB) are gated on DATABASE_URL via a single
``needs_db`` marker applied with ``pytest.mark.skipif`` per test.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from calisthenics_api.auth import requires_tier
from calisthenics_api.billing import NullProvider
from calisthenics_api.config import get_settings
from calisthenics_api.db.models import Tier, tier_at_least
from calisthenics_api.main import app

DATABASE_URL = os.environ.get("DATABASE_URL", "")

needs_db = pytest.mark.skipif(
    not DATABASE_URL,
    reason="DATABASE_URL not set; integration test needs a live DB.",
)


# -----------------------------------------------------------------------------#
# Fixtures
# -----------------------------------------------------------------------------#


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


# -----------------------------------------------------------------------------#
# Tier ordering helper (pure, no I/O)
# -----------------------------------------------------------------------------#


@pytest.mark.parametrize(
    ("user_tier", "required", "expected"),
    [
        (Tier.FREE, Tier.FREE, True),
        (Tier.FREE, Tier.MONTHLY, False),
        (Tier.FREE, Tier.LIFETIME, False),
        (Tier.MONTHLY, Tier.FREE, True),
        (Tier.MONTHLY, Tier.MONTHLY, True),
        (Tier.MONTHLY, Tier.YEARLY, True),  # monthly == yearly for feature access
        (Tier.MONTHLY, Tier.LIFETIME, False),
        (Tier.YEARLY, Tier.MONTHLY, True),
        (Tier.YEARLY, Tier.LIFETIME, False),
        (Tier.LIFETIME, Tier.MONTHLY, True),
        (Tier.LIFETIME, Tier.LIFETIME, True),
        (None, Tier.MONTHLY, False),
        ("garbage", Tier.FREE, False),
    ],
)
def test_tier_at_least(
    user_tier: str | None, required: str, expected: bool
) -> None:
    assert tier_at_least(user_tier, required) is expected


def test_requires_tier_rejects_unknown_tier() -> None:
    """Misconfiguration guard — fail loud at app boot, not at request time."""
    with pytest.raises(ValueError, match="not a known tier"):
        requires_tier("diamond")  # type: ignore[arg-type]


# -----------------------------------------------------------------------------#
# GET /api/v1/billing/me
# -----------------------------------------------------------------------------#


@needs_db
def test_billing_me_returns_free_by_default(client: TestClient) -> None:
    settings = get_settings()
    response = client.get(
        "/api/v1/billing/me",
        headers={"Authorization": f"Bearer {settings.bearer_token}"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["tier"] == "free"
    assert body["provider"] is None
    assert body["started_at"] is None
    assert body["expires_at"] is None


def test_billing_me_requires_auth() -> None:
    """Auth gate is enforced before DB lookup — doesn't need a DB."""
    client = TestClient(app)
    response = client.get("/api/v1/billing/me")
    assert response.status_code == 401


# -----------------------------------------------------------------------------#
# GET /api/v1/billing/plans — public, no auth
# -----------------------------------------------------------------------------#


def test_plans_public_no_auth_needed() -> None:
    """Public endpoint, no DB lookup — pure unit test."""
    client = TestClient(app)
    response = client.get("/api/v1/billing/plans")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["currency"] == "USD"
    tiers = [p["tier"] for p in body["plans"]]
    assert tiers == ["monthly", "yearly", "lifetime"]
    for plan in body["plans"]:
        assert plan["price_cents"] > 0
        assert len(plan["features"]) >= 1


# -----------------------------------------------------------------------------#
# POST /api/v1/billing/checkout — NullProvider path
# -----------------------------------------------------------------------------#


@needs_db
def test_checkout_503_when_provider_not_configured(client: TestClient) -> None:
    settings = get_settings()
    response = client.post(
        "/api/v1/billing/checkout",
        json={"tier": "monthly"},
        headers={"Authorization": f"Bearer {settings.bearer_token}"},
    )
    assert response.status_code == 503, response.text
    assert "PAYMENT_PROVIDER" in response.json()["detail"]


@needs_db
def test_checkout_rejects_invalid_tier() -> None:
    """422 from Pydantic — happens before DB lookup, but the auth dep
    still queries the user table before request body validation,
    so this is technically a DB-needing test."""
    client = TestClient(app)
    settings = get_settings()
    response = client.post(
        "/api/v1/billing/checkout",
        json={"tier": "diamond"},
        headers={"Authorization": f"Bearer {settings.bearer_token}"},
    )
    assert response.status_code == 422


def test_checkout_requires_auth() -> None:
    client = TestClient(app)
    response = client.post(
        "/api/v1/billing/checkout",
        json={"tier": "monthly"},
    )
    assert response.status_code == 401


# -----------------------------------------------------------------------------#
# POST /api/v1/billing/cancel
# -----------------------------------------------------------------------------#


@needs_db
def test_cancel_is_noop_for_free_user(client: TestClient) -> None:
    settings = get_settings()
    response = client.post(
        "/api/v1/billing/cancel",
        headers={"Authorization": f"Bearer {settings.bearer_token}"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "cancel_scheduled"
    assert body["effective_at"] is None


def test_cancel_requires_auth() -> None:
    client = TestClient(app)
    response = client.post("/api/v1/billing/cancel")
    assert response.status_code == 401


# -----------------------------------------------------------------------------#
# POST /api/v1/billing/webhook — NullProvider path
# -----------------------------------------------------------------------------#


def test_webhook_rejects_when_provider_unconfigured() -> None:
    """NullProvider returns None from parse_webhook → route returns 401.

    This guards against accidentally exposing a working webhook
    endpoint without signature verification when someone wires up a
    real provider and forgets to implement parse_webhook.
    """
    client = TestClient(app)
    response = client.post(
        "/api/v1/billing/webhook",
        content=b'{"id": "evt_test", "type": "checkout.session.completed"}',
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid webhook signature."


def test_webhook_excluded_from_openapi() -> None:
    """Webhook endpoint must not appear in /openapi.json — it has no
    auth, no schema, and isn't a public API surface."""
    client = TestClient(app)
    spec = client.get("/openapi.json").json()
    paths = spec.get("paths", {})
    for path in paths:
        if "billing" in path:
            # /webhook is the only POST on billing that should be hidden.
            # Verify by checking methods dict for 'post' is absent OR
            # the path isn't the webhook path.
            assert "webhook" not in path, (
                f"Webhook endpoint leaked into OpenAPI at {path}"
            )


# -----------------------------------------------------------------------------#
# requires_tier() — in-memory unit test (no HTTP roundtrip)
# -----------------------------------------------------------------------------#


class _FakeResult:
    def __init__(self, user):
        self._user = user

    def scalar_one_or_none(self):
        return self._user


class _FakeSession:
    def __init__(self, user):
        self._user = user

    async def execute(self, stmt):
        return _FakeResult(self._user)


def _user_with_tier(tier: str | None) -> SimpleNamespace:
    """Build a fake user with all subscription_* fields populated as None.

    The webhook helper ``_apply_event_to_user`` mutates these fields,
    so they must exist on the namespace even if their DB-side default
    would be NULL.
    """
    return SimpleNamespace(
        id="00000000-0000-0000-0000-000000000001",
        email="t@example.com",
        subscription_tier=tier,
        subscription_started_at=None,
        subscription_expires_at=None,
        subscription_cancel_at=None,
        subscription_external_id=None,
    )


async def test_requires_tier_passes_for_paid_user() -> None:
    user = _user_with_tier(Tier.MONTHLY)
    auth = SimpleNamespace(user_id=user.id, email=user.email)
    result = await requires_tier(Tier.MONTHLY)(auth=auth, session=_FakeSession(user))
    assert result is auth


async def test_requires_tier_blocks_free_user() -> None:
    user = _user_with_tier(Tier.FREE)
    auth = SimpleNamespace(user_id=user.id, email=user.email)
    with pytest.raises(HTTPException) as exc_info:
        await requires_tier(Tier.MONTHLY)(auth=auth, session=_FakeSession(user))
    assert exc_info.value.status_code == 402
    assert exc_info.value.headers["X-Required-Tier"] == "monthly"
    assert exc_info.value.headers["X-Current-Tier"] == "free"


async def test_requires_tier_blocks_missing_user() -> None:
    auth = SimpleNamespace(
        user_id="00000000-0000-0000-0000-000000000099", email="g@example.com"
    )
    with pytest.raises(HTTPException) as exc_info:
        await requires_tier(Tier.MONTHLY)(auth=auth, session=_FakeSession(None))
    assert exc_info.value.status_code == 401


# -----------------------------------------------------------------------------#
# NullProvider unit checks
# -----------------------------------------------------------------------------#


def test_null_provider_reports_unconfigured_on_checkout() -> None:
    settings = get_settings()
    provider = NullProvider(settings)
    session = provider.create_checkout_session(
        user_id="u1",
        user_email="u@example.com",
        tier="monthly",
        success_url="https://x/success",
        cancel_url="https://x/cancel",
    )
    assert session.provider_configured is False
    assert session.checkout_url == ""
    assert session.external_session_id == ""


def test_null_provider_returns_none_on_webhook() -> None:
    settings = get_settings()
    provider = NullProvider(settings)
    event = provider.parse_webhook(payload=b"{}", signature="anything")
    assert event is None


# -----------------------------------------------------------------------------#
# _apply_event_to_user (private helper, exercised via webhook path)
# -----------------------------------------------------------------------------#


def test_apply_checkout_event_sets_tier_and_expires() -> None:
    """Smoke test the helper — ensures webhook → user mapping doesn't
    regress when the real provider integration lands."""
    from calisthenics_api.routes.billing import _apply_event_to_user
    from calisthenics_api.billing import WebhookEvent

    user = _user_with_tier(Tier.FREE)
    user.subscription_external_id = "cus_test_123"

    expires = datetime.now(timezone.utc)
    event = WebhookEvent(
        kind="checkout_completed",
        external_user_id="cus_test_123",
        tier="yearly",
        expires_at=expires,
        external_event_id="evt_1",
    )
    _apply_event_to_user(user, event)

    assert user.subscription_tier == "yearly"
    assert user.subscription_started_at is not None
    assert user.subscription_expires_at == expires
    assert user.subscription_cancel_at is None


def test_apply_cancel_event_clears_paid_state() -> None:
    from calisthenics_api.routes.billing import _apply_event_to_user
    from calisthenics_api.billing import WebhookEvent

    user = _user_with_tier(Tier.MONTHLY)
    user.subscription_external_id = "cus_test_123"
    user.subscription_started_at = datetime.now(timezone.utc)

    event = WebhookEvent(
        kind="subscription_canceled",
        external_user_id="cus_test_123",
        tier=None,
        expires_at=datetime.now(timezone.utc),
        external_event_id="evt_2",
    )
    _apply_event_to_user(user, event)

    assert user.subscription_tier == Tier.FREE
    assert user.subscription_external_id is None
    assert user.subscription_cancel_at is not None


def test_lifetime_checkout_clears_expires_at() -> None:
    """Lifetime tier must not have an expiry — recurring renewal logic
    would otherwise keep pushing it forward forever."""
    from calisthenics_api.routes.billing import _apply_event_to_user
    from calisthenics_api.billing import WebhookEvent

    user = _user_with_tier(Tier.FREE)
    user.subscription_external_id = "cus_test_999"

    event = WebhookEvent(
        kind="checkout_completed",
        external_user_id="cus_test_999",
        tier="lifetime",
        expires_at=datetime.now(timezone.utc),  # provider sends it; we ignore it
        external_event_id="evt_3",
    )
    _apply_event_to_user(user, event)

    assert user.subscription_tier == "lifetime"
    assert user.subscription_expires_at is None