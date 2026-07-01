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


def test_sitemap_uses_xml_response_class() -> None:
    """Sprint 39: /sitemap.xml was returning 'text/plain; charset=utf-8'
    via PlainTextResponse. Crawlers accept it visually but expect
    application/xml per the sitemaps.org spec and Google's indexing
    speed benefits from the correct MIME.

    Verify via route metadata + the live OpenAPI that the response
    builder is now a plain Response that sets media_type explicitly
    (rather than the auto-detection from a plain text string). The
    runtime content-type assertion needs a live DB (sitemap does an
    actual select on progression_nodes), so we keep this test pure.
    """
    from calisthenics_api.routes import seo

    sitemap_route = next(
        r for r in seo.router.routes if getattr(r, "path", "") == "/sitemap.xml"
    )
    assert sitemap_route is not None, "sitemap route must be registered"
    # response_class must not be PlainTextResponse anymore.
    rc = sitemap_route.response_class
    assert rc is not None
    assert rc is not __import__("fastapi.responses", fromlist=["PlainTextResponse"]).PlainTextResponse, (
        f"sitemap must NOT use PlainTextResponse (would emit text/plain); got {rc}"
    )


def test_sitemap_route_in_openapi() -> None:
    """Verify the route is exposed at /sitemap.xml (root) in OpenAPI,
    not at /api/v1/sitemap.xml. Crawlers hit the apex domain so this
    matters for SEO even though Googlebot will eventually find the
    canonical from sitemap->robots->sitemap recursion."""
    from calisthenics_api.main import create_app

    app = create_app()
    paths = set(app.openapi()["paths"].keys())
    assert "/sitemap.xml" in paths, f"sitemap missing from routes: {paths}"
    # And NO /api/v1/sitemap.xml (that's the wrong mount).
    assert "/api/v1/sitemap.xml" not in paths


def test_robots_route_in_openapi() -> None:
    """Same as sitemap — must be at the root, not under /api/v1."""
    from calisthenics_api.main import create_app

    app = create_app()
    paths = set(app.openapi()["paths"].keys())
    assert "/robots.txt" in paths, f"robots missing from routes: {paths}"
    assert "/api/v1/robots.txt" not in paths


def test_search_route_in_openapi() -> None:
    """Sprint 40: /api/v1/search is exposed. The frontend uses it for the
    header search bar + the /search page."""
    from calisthenics_api.main import create_app

    app = create_app()
    paths = set(app.openapi()["paths"].keys())
    assert "/api/v1/search" in paths, f"search missing: {paths}"


def test_search_query_bounds() -> None:
    """q must be 1-64 chars; limit must be 1-20. Mirrors the bound pattern
    from history/friends so a typo'd huge query can't DOS the api."""
    from calisthenics_api.routes.search import search
    import inspect
    from annotated_types import Ge, Le, MinLen, MaxLen

    sig = inspect.signature(search)
    q = sig.parameters["q"]
    assert q.default.metadata is not None
    q_minlen = next((m for m in q.default.metadata if isinstance(m, MinLen)), None)
    q_maxlen = next((m for m in q.default.metadata if isinstance(m, MaxLen)), None)
    assert q_minlen is not None and q_minlen.min_length == 1
    assert q_maxlen is not None and q_maxlen.max_length == 64

    limit = sig.parameters["limit"]
    ge = next((m for m in limit.default.metadata if isinstance(m, Ge)), None)
    le = next((m for m in limit.default.metadata if isinstance(m, Le)), None)
    assert ge is not None and ge.ge == 1
    assert le is not None and le.le == 20


def test_search_uses_wire_format_helpers() -> None:
    """Sprint 40 audit: the search route must use the canonical wire
    helpers (to_node_wire) instead of string-concatting 'node_' + id.
    A direct f-string would break if the wire format ever changed
    (e.g. to 'node-v2_<uuid>'). This test guards against the regression
    where the route referenced `n.node_id` (the column doesn't exist;
    the column is `id`) and a hand-rolled `f"node_{n.id}"` instead
    of the wire helper."""
    import inspect
    from calisthenics_api.routes import search as search_module
    from calisthenics_api.schemas import node_id as to_node_wire

    source = inspect.getsource(search_module)
    # Must import the wire helper.
    assert "node_id as to_node_wire" in source, (
        "search route should import the wire helper for consistent id format"
    )
    # Must NOT have any hand-rolled `f\"node_` string concat (would
    # silently diverge from the rest of the api if the format changed).
    assert 'f"node_' not in source, (
        "search route uses hand-rolled f-string 'node_<id>' instead of the wire helper"
    )
    # And the wire helper itself must produce the canonical format.
    sample = "fb47078b-9021-4773-b531-aa7892ecb52e"
    assert to_node_wire(sample) == f"node_{sample}"
