"""Sprint 38 RED-7 — JWT → httpOnly cookie migration tests.

Cookie attribute tests are DB-free (test the helpers directly with a
mock Response). Route-existence tests confirm the new endpoints are
mounted on the router so the SPA / whoami / signout all resolve.

Full end-to-end round-trip (verify → cookie → whoami → signout) is
covered by the integration tests in test_auth_routes.py when DATABASE_URL
is set. Here we focus on what's actually exerciseable without DB.
"""

from __future__ import annotations

from unittest.mock import MagicMock



def test_session_cookie_settings_defaults() -> None:
    """The defaults should be production-safe: HttpOnly always, Secure
    resolves to True in prod, SameSite=Lax (the typical web-app choice
    that blocks cross-site POST/PUT/DELETE while allowing top-level GET
    navigations)."""
    from calisthenics_api.config import Settings

    s = Settings()
    assert s.session_cookie_name == "ct_session"
    assert s.session_cookie_refresh_name == "ct_session_refresh"
    assert s.session_cookie_secure is True
    assert s.session_cookie_samesite == "lax"
    # 30 days in seconds — matches refresh TTL.
    assert s.session_cookie_max_age == 30 * 24 * 60 * 60


def test_session_cookie_settings_override() -> None:
    """Operators can override via env. We confirm the field plumbing."""
    from calisthenics_api.config import Settings

    s = Settings(
        session_cookie_name="custom_session",
        session_cookie_refresh_name="custom_refresh",
        session_cookie_samesite="strict",
        session_cookie_max_age=600,
        session_cookie_domain="example.com",
    )
    assert s.session_cookie_name == "custom_session"
    assert s.session_cookie_refresh_name == "custom_refresh"
    assert s.session_cookie_samesite == "strict"
    assert s.session_cookie_max_age == 600
    assert s.session_cookie_domain == "example.com"


def test_set_session_cookie_attributes() -> None:
    """The set_cookie helper should always mark the cookie HttpOnly and
    apply our production defaults (Secure in prod, SameSite=Lax)."""
    from calisthenics_api.auth import set_session_cookie
    from calisthenics_api.config import Settings

    settings = Settings(environment="production")
    response = MagicMock()
    set_session_cookie(
        response,
        access_token="access-fake",
        refresh_token="refresh-fake",
        settings=settings,
    )

    # Expect two set_cookie calls — one for access, one for refresh.
    assert response.set_cookie.call_count == 2
    first = response.set_cookie.call_args_list[0]
    second = response.set_cookie.call_args_list[1]
    assert first.kwargs["key"] == "ct_session"
    assert first.kwargs["value"] == "access-fake"
    assert first.kwargs["httponly"] is True
    assert first.kwargs["secure"] is True
    assert first.kwargs["samesite"] == "lax"
    assert second.kwargs["key"] == "ct_session_refresh"
    assert second.kwargs["value"] == "refresh-fake"
    assert second.kwargs["httponly"] is True
    assert second.kwargs["secure"] is True


def test_set_session_cookie_no_secure_in_dev() -> None:
    """In development, Secure should be False so localhost works over HTTP.
    Local dev / Postman / CI use plain HTTP; secure-only would block login."""
    from calisthenics_api.auth import set_session_cookie
    from calisthenics_api.config import Settings

    settings = Settings(environment="development")
    response = MagicMock()
    set_session_cookie(
        response,
        access_token="access-fake",
        settings=settings,
    )
    assert response.set_cookie.call_count == 1
    first = response.set_cookie.call_args_list[0]
    # environment=="development" → Secure should be False (covers localhost).
    assert first.kwargs["secure"] is False
    # HttpOnly must still be True even in dev — the whole point.
    assert first.kwargs["httponly"] is True


def test_set_session_cookie_skips_refresh_when_none() -> None:
    """A caller using only the access token (e.g. /auth/refresh) shouldn't
    rewrite the refresh cookie unless one was passed."""
    from calisthenics_api.auth import set_session_cookie
    from calisthenics_api.config import Settings

    settings = Settings(environment="production")
    response = MagicMock()
    set_session_cookie(response, access_token="access-only", settings=settings)
    assert response.set_cookie.call_count == 1
    first = response.set_cookie.call_args_list[0]
    assert first.kwargs["key"] == "ct_session"


def test_clear_session_cookie_both_names() -> None:
    """Signout deletes BOTH cookies, not just the access one. A leftover
    refresh token would let the SPA get re-authenticated without the user
    signing back in."""
    from calisthenics_api.auth import clear_session_cookie
    from calisthenics_api.config import Settings

    settings = Settings()
    response = MagicMock()
    clear_session_cookie(response, settings=settings)
    # delete_cookie called twice — once for each cookie name.
    assert response.delete_cookie.call_count == 2
    deleted_keys = {c.kwargs["key"] for c in response.delete_cookie.call_args_list}
    assert deleted_keys == {"ct_session", "ct_session_refresh"}


def test_routes_registered() -> None:
    """Confirm the new auth routes are mounted on the router. If somebody
    refactors and accidentally drops one, this catches it before SPA
    fetches start 404ing."""
    from calisthenics_api.routes.auth import router

    paths = {r.path for r in router.routes}
    # Original endpoints.
    assert "/auth/magic-link" in paths
    assert "/auth/verify" in paths
    assert "/auth/refresh" in paths
    # New RED-7 endpoints.
    assert "/auth/signout" in paths
    assert "/auth/whoami" in paths


def test_refresh_request_accepts_empty_body() -> None:
    """Sprint 38 RED-7: refresh_request body is now optional because the
    refresh token can come from the HttpOnly cookie (which the SPA can
    never read out, so it can't put it back in the body). Old scripts
    that POST a JSON token must still work."""
    from calisthenics_api.schemas import RefreshRequest

    # Empty body allowed.
    r = RefreshRequest()
    assert r.refresh_token is None

    # Body with token still allowed.
    r = RefreshRequest(refresh_token="abc")
    assert r.refresh_token == "abc"


def test_effective_session_cookie_domain_from_web_base_url() -> None:
    """Sprint 39 P2: the cookie Domain attribute must span both
    api.<domain> and <domain> subdomains, or the SPA's fetch from the
    apex won't carry the cookie that /auth/verify set on the api
    subdomain.

    Derived from web_base_url automatically (last 2 labels = eTLD+1,
    which works for simple TLDs like `.ca`, `.com`, `.io`):
    - https://api.workout.ashbi.ca -> ".ashbi.ca"
    - http://localhost:5173 -> None (host-only, dev)
    - 127.0.0.1 -> None (host-only)

    For multi-part TLDs (`co.uk`, `com.au`) or sub-subdomains
    (`staging.api.workout.ashbi.ca`), operators must override via
    `session_cookie_domain` explicitly. The naive last-2-labels
    heuristic can't detect eTLD+1 without a public-suffix list.
    """
    from calisthenics_api.config import Settings

    # Production: eTLD+1 of `workout.ashbi.ca` is `ashbi.ca`.
    s = Settings(web_base_url="https://workout.ashbi.ca")
    assert s.effective_session_cookie_domain == ".ashbi.ca"

    # Same domain derived from api subdomain.
    s = Settings(web_base_url="https://api.workout.ashbi.ca")
    assert s.effective_session_cookie_domain == ".ashbi.ca"

    # Dev: leave host-only.
    s = Settings(web_base_url="http://localhost:5173")
    assert s.effective_session_cookie_domain is None

    # 127.0.0.1 also host-only.
    s = Settings(web_base_url="http://127.0.0.1:8000")
    assert s.effective_session_cookie_domain is None

    # Explicit override beats derivation.
    s = Settings(
        web_base_url="https://workout.ashbi.ca",
        session_cookie_domain=".custom.example.com",
    )
    assert s.effective_session_cookie_domain == ".custom.example.com"
