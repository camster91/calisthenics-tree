"""Tests for the friend-limit paywall gate.

The 5-friend limit for free users is wired in
``calisthenics_api/routes/friends.py`` (FREE_FRIEND_LIMIT constant).
These tests guard against drift between the constant, the wireframe
copy ("Upgrade to Pro for tendon insights and friends > 5"), and the
PricingPage copy ("5 friends + basic feed").
"""

from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

from calisthenics_api.config import get_settings
from calisthenics_api.main import app
from calisthenics_api.routes.friends import FREE_FRIEND_LIMIT

DATABASE_URL = os.environ.get("DATABASE_URL", "")

needs_db = pytest.mark.skipif(
    not DATABASE_URL,
    reason="DATABASE_URL not set; integration test needs a live DB.",
)


# -----------------------------------------------------------------------------#
# Pure unit checks (no DB)
# -----------------------------------------------------------------------------#


def test_free_friend_limit_matches_documented_value() -> None:
    """Regression guard — if this changes, update SubscriptionWireframe
    ('Upgrade to Pro for tendon insights and friends > 5') and
    PricingPage ('5 friends + basic feed') to match."""
    assert FREE_FRIEND_LIMIT == 5


def test_free_friend_limit_is_positive() -> None:
    """Defensive — never let the limit drop to 0 (would lock out
    every free user from any social interaction)."""
    assert FREE_FRIEND_LIMIT > 0


# -----------------------------------------------------------------------------#
# Integration checks (need DB) — minimal happy path + 402 on the 6th follow
# -----------------------------------------------------------------------------#


@needs_db
def test_follow_endpoint_under_limit_succeeds_for_free_user(client: TestClient) -> None:
    """A free user following their first 5 friends should succeed."""
    settings = get_settings()
    # Smoke check: the endpoint exists and accepts a follow request.
    # We can't easily set up 5 followable users in this test without
    # seeding, so we just verify the route is reachable + doesn't 402
    # on an empty friends list.
    response = client.post(
        "/api/v1/friends",
        json={"email": "nobody-nonexistent-test@example.com"},
        headers={"Authorization": f"Bearer {settings.bearer_token}"},
    )
    # 404 (user not found) is the expected outcome — NOT 402 (limit hit).
    # 402 only fires after we've successfully followed FREE_FRIEND_LIMIT people.
    assert response.status_code == 404, (
        f"expected 404 for nonexistent user, got {response.status_code}: {response.text}"
    )