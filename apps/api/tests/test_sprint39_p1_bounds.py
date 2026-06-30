"""Sprint 39 hardening — bound public endpoint inputs.

YELLOW-tier issues from the Sprint 38 audit that closed into P1 fixes
after Sprint 38 shipped. Each test guards a real bound that protects
the api from a caller passing an unbounded query parameter.
"""

from __future__ import annotations

from fastapi.testclient import TestClient


# These tests rely on the unit test conftest pattern that creates the
# app once and reuses it across tests. We rely on the DB being
# unavailable (no DATABASE_URL) and exercise the validation guard at the
# Pydantic / FastAPI layer — the request must 422 BEFORE the route
# handler touches the DB. That keeps the test self-contained.
#
# We can't use the full app because validate_production_secrets() will
# refuse to start without POSTMARK_TOKEN. We patch create_app via
# dependency_overrides to skip that, OR we directly hit the FastAPI
# router — but the routes depend on get_session which needs DB.
#
# Simplest approach: extract the Query() definition from the route and
# assert it independently. Query() introspection exposes ge/le in its
# metadata, so we can read the constraint without running the app.


def test_unlocks_endpoint_has_upper_limit() -> None:
    """Sprint 39 P1: /api/v1/users/{user_id}/unlocks was `int = 20` with
    NO upper bound. A caller could `?limit=10000` and DOS the api or
    pull a user's full unlock history. Now bounded to 100 like /feed.

    This test introspects the Query() metadata on the route to ensure
    the upper bound is set; it doesn't need DB or the full app.
    """
    from calisthenics_api.routes.friends import get_user_unlocks
    import inspect
    from annotated_types import Ge, Le

    sig = inspect.signature(get_user_unlocks)
    limit_param = sig.parameters["limit"]
    # Pydantic v2 stores ge/le constraints in `metadata` as Ge / Le
    # annotated-types instances, not as direct attributes.
    query = limit_param.default
    ge = next((m for m in query.metadata if isinstance(m, Ge)), None)
    le = next((m for m in query.metadata if isinstance(m, Le)), None)
    assert ge is not None and ge.ge == 1, (
        f"limit lower bound must be 1 (ge=1), got ge={ge}"
    )
    assert le is not None and le.le == 100, (
        f"limit upper bound must be 100 (le=100), got le={le}"
    )