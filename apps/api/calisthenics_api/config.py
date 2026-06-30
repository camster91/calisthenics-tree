"""Application configuration loaded from environment variables."""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://calisthenics:devpassword@localhost:5433/calisthenics",
        description="Async SQLAlchemy database URL",
    )

    # Auth
    bearer_token: str = Field(
        default="dev-bearer-token-replace-me",
        description="Static bearer token for dev/CI. Production uses JWTs issued by /auth/magic-link + /auth/verify.",
    )
    # JWT signing — required in production. Dev falls back to bearer_token above.
    jwt_secret: str = Field(
        default="dev-jwt-secret-change-me-in-production-use-secrets-token-urlsafe-64",
        description="HMAC secret for JWT signature (PyJWT HS256).",
    )
    jwt_algorithm: str = Field(default="HS256")
    jwt_access_ttl_secs: int = Field(default=3600, ge=60, description="Access token TTL (default 1h).")
    jwt_refresh_ttl_secs: int = Field(
        default=60 * 60 * 24 * 30,  # 30 days
        ge=3600,
        description="Refresh token TTL (default 30 days).",
    )
    # Magic-link signing — required for production. Dev falls back to jwt_secret.
    magic_link_secret: str = Field(
        default="dev-magic-link-secret-change-me-in-production",
        description="HMAC secret for magic-link token signature (itsdangerous).",
    )
    magic_link_ttl_secs: int = Field(default=900, ge=60, description="Magic-link TTL (default 15min).")
    # Email — when POSTMARK_TOKEN is set, magic-link emails are sent via Postmark.
    postmark_token: str | None = Field(
        default=None,
        description="Postmark server token. When unset, magic-link tokens are logged to stdout (dev only).",
    )
    postmark_from_email: str = Field(
        default="hello@calisthenics-tree.com",
        description="From-address used when sending magic-link emails via Postmark.",
    )
    # Web app base URL — used to build magic-link URLs (https://app.../auth/verify?token=...).
    web_base_url: str = Field(
        default="http://localhost:5173",
        description="Origin of the web SPA. Magic-link emails link back here.",
    )

    # App
    environment: str = Field(default="development")
    api_v1_prefix: str = "/api/v1"

    # Observability
    # Sentry DSN. Optional — when empty/None, Sentry is disabled at startup.
    sentry_dsn: str | None = None

    # Share cards (Phase 1.5 — T39)
    # Directory containing pre-rendered share card PNGs.
    # Default assumes repo-root layout (apps/web/public/share/).
    # In production, render via `cd apps/web && npm run share:render` as a
    # deploy-time step and mount the directory as a Docker volume.
    share_dir: str = "../web/public/share"

    # Rate limiting — per-IP sliding-window limits for unauth'd /
    # token-bearing endpoints. Conservative defaults; bump in prod
    # once we have real traffic data. See rate_limit.py for how the
    # limits are applied (bucket name → settings attr convention).
    rate_limit_magic_link_per_min: int = Field(default=5, ge=1)
    rate_limit_refresh_per_min: int = Field(default=30, ge=1)
    # Sprint 39 P1: cap /auth/verify attempts (token brute force would
    # otherwise be limited only by magic_link issuance). Cap is generous
    # because the legitimate SPA flow can hit verify once per sign-in +
    # a few retries on slow connections, but unbounded is too loose.
    rate_limit_verify_per_min: int = Field(default=30, ge=1)
    # /auth/signout is anonymous — anyone can hit it. Cheap to gate.
    rate_limit_signout_per_min: int = Field(default=30, ge=1)

    # Trust X-Forwarded-For header for client IP resolution. Set to
    # True in production (we're behind Cloudflare + Caddy). Set to
    # False for direct-exposure deploys so attackers can't spoof the
    # header to bypass rate limits.
    trust_forwarded_for: bool = Field(default=False)

    # Sprint 38 hardening RED-7 — cookie-based session config.
    # When session_cookie_secure=True (production), the session cookie
    # gets the Secure flag (HTTPS-only) + SameSite=Lax. HttpOnly is
    # always set. Lax is chosen over Strict because magic-link clicks
    # arrive as cross-site GET navigations — Strict would drop the
    # cookie on those clicks and require a second round-trip. Lax
    # still protects against most CSRF (only top-level GET cross-site
    # requests carry the cookie, no POST/PUT/DELETE cross-site).
    session_cookie_name: str = Field(
        default="ct_session",
        description="Name of the session cookie set on /auth/verify.",
    )
    session_cookie_refresh_name: str = Field(
        default="ct_session_refresh",
        description=(
            "Name of the refresh-token cookie. Stored separately so /auth/refresh "
            "can read the refresh-typed JWT without ambiguity when the access "
            "token is already expired."
        ),
    )
    session_cookie_secure: bool = Field(
        default=True,
        description=(
            "When True, the session cookie gets the Secure flag (HTTPS-only). "
            "Auto-derived from environment=='production' at startup."
        ),
    )
    session_cookie_max_age: int = Field(
        default=30 * 24 * 60 * 60,
        description="Session cookie max-age in seconds. Matches the JWT refresh TTL (30d).",
    )
    session_cookie_samesite: str = Field(
        default="lax",
        description=(
            "Cookie SameSite policy. 'lax' for typical web apps (allows top-level "
            "GET cross-site navigations, blocks cross-site state-changing requests)."
        ),
    )
    session_cookie_domain: str | None = Field(
        default=None,
        description=(
            "Optional explicit Domain attribute. If unset, the cookie is host-only "
            "(the API + web are on different subdomains so host-only is correct)."
        ),
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
