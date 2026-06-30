"""Sprint 39 hardening — bound public endpoint inputs.

YELLOW-tier issues from the Sprint 38 audit that closed into P1 fixes
after Sprint 38 shipped. Each test guards a real bound that protects
the api from a caller passing an unbounded query parameter.
"""

from __future__ import annotations



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

def test_history_endpoint_has_limit_query_bound() -> None:
    """Sprint 39 YELLOW: /api/v1/users/me/history had a hardcoded
    _RECENT_LIMIT = 200 with no client override. Power users with
    thousands of workouts got a 200-row payload every time. Now
    client-controllable with default 50, max 200."""
    from calisthenics_api.routes.history import my_history
    import inspect
    from annotated_types import Ge, Le

    sig = inspect.signature(my_history)
    limit_param = sig.parameters["limit"]
    query = limit_param.default
    ge = next((m for m in query.metadata if isinstance(m, Ge)), None)
    le = next((m for m in query.metadata if isinstance(m, Le)), None)
    assert ge is not None and ge.ge == 1, f"lower bound ge=1, got {ge}"
    assert le is not None and le.le == 200, f"upper bound le=200, got {le}"
    assert query.default == 50, f"default limit 50, got {query.default}"


def test_friends_endpoint_has_limit_query_bound() -> None:
    """Sprint 39 YELLOW: /api/v1/friends returned ALL follows with no
    limit. Power user following thousands of people would get a
    massive payload every call. Now bounded: default 50, max 200."""
    from calisthenics_api.routes.friends import list_friends
    import inspect
    from annotated_types import Ge, Le

    sig = inspect.signature(list_friends)
    limit_param = sig.parameters["limit"]
    query = limit_param.default
    ge = next((m for m in query.metadata if isinstance(m, Ge)), None)
    le = next((m for m in query.metadata if isinstance(m, Le)), None)
    assert ge is not None and ge.ge == 1, f"lower bound ge=1, got {ge}"
    assert le is not None and le.le == 200, f"upper bound le=200, got {le}"
    assert query.default == 50, f"default limit 50, got {query.default}"


def test_csp_route_module_importable() -> None:
    """Sprint 39 YELLOW: CSP report-uri was set in the Caddyfile but
    the FastAPI endpoint didn't exist — reports from the browser were
    404'd and silently dropped. Now /api/v1/_csp_report accepts the
    POST and logs it to docker logs."""
    from calisthenics_api.routes import csp
    from fastapi import APIRouter

    assert isinstance(csp.router, APIRouter)
    assert csp.router.prefix == "/_csp_report"
    assert hasattr(csp, "csp_report"), "csp_report handler must be exported"


def test_csp_report_handler_accepts_csp_report_envelope(caplog) -> None:
    """End-to-end check: the endpoint accepts both shapes browsers
    send (legacy csp-report + new reports+json) and logs violations."""
    import logging
    from starlette.testclient import TestClient
    from calisthenics_api.main import app

    client = TestClient(app)
    payload = {"csp-report": {"violated-directive": "script-src", "blocked-uri": "https://evil.example/x.js"}}
    with caplog.at_level(logging.WARNING, logger="calisthenics_api.routes.csp"):
        resp = client.post("/api/v1/_csp_report", json=payload)
    assert resp.status_code == 200
    assert resp.json() == {"status": "logged"}
    assert any("csp-violation" in r.message for r in caplog.records)
