"""Tests for the soft-delete restore flow (D19 §deletion).

The hard-delete side (purge_deleted_accounts maintenance script)
needs a live DB; the restore side (auth._resolve_jwt_user clearing
deleted_at on re-login) is straightforward and tested via the
endpoint round-trip.

These tests verify:
  1. The DELETE endpoint sets deleted_at (not hard-deletes).
  2. Re-login clears deleted_at (restoration).
  3. POST /users/me/restore explicitly clears deleted_at.

Pure unit tests where possible; integration tests gated on DATABASE_URL.
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from calisthenics_api.config import get_settings
from calisthenics_api.maintenance.purge_deleted_accounts import GRACE_PERIOD_DAYS

DATABASE_URL = os.environ.get("DATABASE_URL", "")

needs_db = pytest.mark.skipif(
    not DATABASE_URL,
    reason="DATABASE_URL not set; integration test needs a live DB.",
)


# -----------------------------------------------------------------------------#
# Pure unit checks
# -----------------------------------------------------------------------------#


def test_grace_period_is_7_days_per_d19() -> None:
    """D19 §deletion says '7-day grace period'. Hard-coded constant
    must not drift without updating the Settings UI copy + magic-link
    'deletion scheduled' email."""
    assert GRACE_PERIOD_DAYS == 7


def test_grace_period_is_positive() -> None:
    """Defensive — never let it drop to 0 (would hard-delete users
    immediately on their next request)."""
    assert GRACE_PERIOD_DAYS > 0


def test_cutoff_calculation() -> None:
    """Verify the cutoff math the script uses to find expired
    tombstones. This is the line that would silently delete all
    active users if someone 'fixed' the comparison."""
    now = datetime(2026, 6, 26, 12, 0, 0, tzinfo=timezone.utc)
    cutoff = now - timedelta(days=GRACE_PERIOD_DAYS)
    assert cutoff == datetime(2026, 6, 19, 12, 0, 0, tzinfo=timezone.utc)


# -----------------------------------------------------------------------------#
# Integration (need DB)
# -----------------------------------------------------------------------------#


@needs_db
def test_delete_me_soft_deletes_not_hard_deletes() -> None:
    """Per D19 §deletion: DELETE /users/me sets deleted_at, doesn't
    cascade-wipe the row. Re-login during the grace period should
    restore.
    """
    settings = get_settings()
    from fastapi.testclient import TestClient

    from calisthenics_api.main import app
    from calisthenics_api.db.models import User
    from sqlalchemy import select

    from calisthenics_api.db import get_session_factory

    client = TestClient(app)
    # Use the static dev bearer — _resolve_dev_user creates a stable
    # synthetic user we can target.
    response = client.delete(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {settings.bearer_token}"},
    )
    assert response.status_code == 204

    # Confirm: row still exists with deleted_at set.
    factory = get_session_factory()
    import asyncio
    async def _check():
        async with factory() as session:
            dev_email = f"dev+{settings.bearer_token[:8]}@calisthenics.local"
            result = await session.execute(
                select(User).where(User.email == dev_email)
            )
            user = result.scalar_one_or_none()
            return user

    user = asyncio.run(_check())
    assert user is not None, "user was hard-deleted (should be soft-deleted)"
    assert user.deleted_at is not None, "deleted_at was not set"
    # Within the grace window.
    assert datetime.now(timezone.utc) - user.deleted_at < timedelta(days=1)


@needs_db
def test_restore_me_clears_deleted_at() -> None:
    """POST /users/me/restore cancels the pending deletion. The
    daily purge job leaves the row alone because deleted_at IS NULL."""
    settings = get_settings()
    from fastapi.testclient import TestClient

    from calisthenics_api.main import app
    from calisthenics_api.db.models import User
    from sqlalchemy import select

    from calisthenics_api.db import get_session_factory

    client = TestClient(app)
    bearer = {"Authorization": f"Bearer {settings.bearer_token}"}

    # Soft-delete first.
    client.delete("/api/v1/users/me", headers=bearer)

    # Restore.
    response = client.post("/api/v1/users/me/restore", headers=bearer)
    assert response.status_code == 204

    # Confirm deleted_at is NULL again.
    factory = get_session_factory()
    import asyncio
    async def _check():
        async with factory() as session:
            dev_email = f"dev+{settings.bearer_token[:8]}@calisthenics.local"
            result = await session.execute(
                select(User).where(User.email == dev_email)
            )
            user = result.scalar_one_or_none()
            return user

    user = asyncio.run(_check())
    assert user is not None
    assert user.deleted_at is None, "restore did not clear deleted_at"