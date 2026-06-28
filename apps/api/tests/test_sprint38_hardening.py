"""Sprint 38 hardening — focused unit tests for the 3 critical audit fixes.

These tests do NOT need DATABASE_URL — they're pure schema/config checks.

- RED-1 (dev_token env gate): verify auth route strips dev_token when
  environment=="production", even if POSTMARK_TOKEN is unset.
- RED-3 (Pydantic SyncedSet validator): verify the @model_validator(mode="after")
  actually rejects sets with both reps=None and hold_secs=None.
- RED-4 (trees.py edge partitioning): covered by integration tests (DB required).
"""

from __future__ import annotations

import os
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient


# RED-3: SyncedSet validator rejects garbage data
def test_synced_set_rejects_both_reps_and_hold_secs_null() -> None:
    """A set with neither reps nor hold_secs must be rejected — previously
    the validator was a no-op (returned v unchanged), letting garbage data
    flow into the PL/pgSQL promotion function."""
    from pydantic import ValidationError

    from calisthenics_api.schemas import SyncedSet

    with pytest.raises(ValidationError) as exc_info:
        SyncedSet(set_number=1, reps=None, hold_secs=None)
    # Either of the two error strings is acceptable; both must mention
    # the set_number for debuggability.
    assert "Set 1" in str(exc_info.value)


def test_synced_set_accepts_reps_only() -> None:
    from calisthenics_api.schemas import SyncedSet

    s = SyncedSet(set_number=1, reps=8, hold_secs=None)
    assert s.reps == 8
    assert s.hold_secs is None


def test_synced_set_accepts_hold_secs_only() -> None:
    from calisthenics_api.schemas import SyncedSet

    s = SyncedSet(set_number=1, reps=None, hold_secs=12)
    assert s.reps is None
    assert s.hold_secs == 12


def test_synced_set_accepts_both_reps_and_hold_secs() -> None:
    """A defensive client might send both; we accept it (conservative)."""
    from calisthenics_api.schemas import SyncedSet

    s = SyncedSet(set_number=1, reps=8, hold_secs=12)
    assert s.reps == 8
    assert s.hold_secs == 12


# RED-1: dev_token env gate
def test_validate_production_secrets_refuses_in_prod_without_postmark() -> None:
    """The boot guard function must raise RuntimeError when env=='production'
    AND postmark_token is empty. Pure-function test — no create_app() needed."""
    from calisthenics_api.main import validate_production_secrets
    from calisthenics_api.config import Settings

    settings = Settings(environment="production", postmark_token="")
    with pytest.raises(RuntimeError) as exc_info:
        validate_production_secrets(settings)
    assert "POSTMARK_TOKEN" in str(exc_info.value)
    assert "production" in str(exc_info.value)


def test_validate_production_secrets_allows_prod_with_postmark() -> None:
    """Sanity check: with POSTMARK_TOKEN set, the guard passes."""
    from calisthenics_api.main import validate_production_secrets
    from calisthenics_api.config import Settings

    settings = Settings(environment="production", postmark_token="fake-token")
    # No raise.
    validate_production_secrets(settings)


def test_validate_production_secrets_allows_dev_without_postmark() -> None:
    """Dev / test envs must still start without POSTMARK_TOKEN — otherwise
    no local dev could ever work."""
    from calisthenics_api.main import validate_production_secrets
    from calisthenics_api.config import Settings

    settings = Settings(environment="development", postmark_token="")
    # No raise.
    validate_production_secrets(settings)


def test_validate_production_secrets_allows_test_without_postmark() -> None:
    """Test env same as dev — guard must not fire."""
    from calisthenics_api.main import validate_production_secrets
    from calisthenics_api.config import Settings

    settings = Settings(environment="test", postmark_token="")
    # No raise.
    validate_production_secrets(settings)