"""Auth dependency — cookie session (Sprint 38 RED-7) OR bearer.

Phase 1 used a single shared bearer token (env: BEARER_TOKEN). Phase 2 added
JWT verification (HS256) via the Authorization header. Phase 3 (Sprint 38
RED-7) prefers HttpOnly+Secure+SameSite=Lax cookies set on /auth/verify,
with Authorization: Bearer kept as a fallback for:
  - Local dev / CI / smoke tests
  - The /auth/refresh endpoint (rotation uses the refresh cookie)
  - External API consumers (Postman, scripts)

Resolution order on each request:
  1. Cookie `ct_session` (production path; HttpOnly, sent automatically)
  2. Authorization: Bearer <credentials> (dev / CI / API consumers)
     a. Static bearer (matches settings.bearer_token) → dev user
     b. JWT (HS256, expected typ=access) → resolve user_id
  3. Otherwise 401
"""

from __future__ import annotations

import uuid

from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from calisthenics_api import security
from calisthenics_api.config import get_settings
from calisthenics_api.db import get_session
from calisthenics_api.db.models import User
from calisthenics_api.schemas import AuthContext

_bearer_scheme = HTTPBearer(auto_error=False)


# -----------------------------------------------------------------------------#
# Cookie helpers — RED-7 session management
# -----------------------------------------------------------------------------#


def set_session_cookie(
    response: Response,
    access_token: str,
    refresh_token: str | None = None,
    settings=None,
) -> None:
    """Sprint 38 RED-7: Set the HttpOnly+Secure+SameSite=Lax session cookies.

    Always HttpOnly. Secure + SameSite=Lax in production. The JWT itself
    is unchanged (HS256) — we just move storage from localStorage to a
    cookie the browser sends automatically. Closes the XSS-via-localStorage
    attack surface: an attacker running JS in our origin can no longer
    exfiltrate the session token because the cookie is unreadable from JS.

    Two cookies:
      - `ct_session` holds the access token (15-min-ish JWT, used by every API call)
      - `ct_session_refresh` holds the refresh token (30-day, used by /auth/refresh)
    Same max-age for both — they're planted at the same moment and should
    expire together. Different names so /auth/refresh can read the
    refresh-typed JWT cookie without ambiguity.
    """
    if settings is None:
        settings = get_settings()

    # Auto-derive Secure from environment at the call site if the operator
    # hasn't overridden it explicitly via env. Production = Secure; dev/test
    # = non-Secure so localhost works.
    secure = settings.session_cookie_secure and settings.environment != "development"

    response.set_cookie(
        key=settings.session_cookie_name,
        value=access_token,
        max_age=settings.session_cookie_max_age,
        path="/",
        # Sprint 39 P2: use effective_session_cookie_domain (derives
        # .workout.ashbi.ca from web_base_url) so the cookie is shared
        # across workout.ashbi.ca and api.workout.ashbi.ca. Without
        # this the SPA's fetch from workout.ashbi.ca can't see the
        # cookie that the api's /auth/verify set on api.workout.ashbi.ca.
        domain=settings.effective_session_cookie_domain,
        secure=secure,
        httponly=True,
        samesite=settings.session_cookie_samesite,
    )
    if refresh_token is not None:
        response.set_cookie(
            key=settings.session_cookie_refresh_name,
            value=refresh_token,
            max_age=settings.session_cookie_max_age,
            path="/",
            domain=settings.effective_session_cookie_domain,
            secure=secure,
            httponly=True,
            samesite=settings.session_cookie_samesite,
        )


def clear_session_cookie(response: Response, settings=None) -> None:
    """Clear both session cookies on signout / token rotation."""
    if settings is None:
        settings = get_settings()

    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
        domain=settings.effective_session_cookie_domain,
    )
    response.delete_cookie(
        key=settings.session_cookie_refresh_name,
        path="/",
        domain=settings.effective_session_cookie_domain,
    )


# -----------------------------------------------------------------------------#
# User resolution
# -----------------------------------------------------------------------------#


async def _resolve_dev_user(creds: str, session: AsyncSession) -> AuthContext:
    """Static-bearer path — preserves Phase 1 dev UX (one user per token)."""
    settings = get_settings()
    if creds != settings.bearer_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Stable UUID per token so re-runs don't fragment user data
    user_email = f"dev+{creds[:8]}@calisthenics.local"
    result = await session.execute(select(User).where(User.email == user_email))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            id=uuid.uuid5(uuid.NAMESPACE_DNS, f"calisthenics:{creds}"),
            email=user_email,
        )
        session.add(user)
        await session.flush()
    return AuthContext(user_id=user.id, email=user.email)


async def _resolve_jwt_user(creds: str, session: AsyncSession) -> AuthContext:
    """JWT path — production auth, issued by /auth/verify or /auth/refresh."""
    try:
        claims = security.decode_jwt(creds, expected_typ="access")
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    try:
        user_id = uuid.UUID(claims["sub"])
    except (KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token subject malformed.",
        ) from exc

    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists.",
        )
    # Soft-delete restore: if the user re-authenticates during the
    # grace period, clear deleted_at so the daily purge job leaves
    # them alone. Per D19 §deletion: "Log in to cancel."
    if user.deleted_at is not None:
        user.deleted_at = None
        await session.flush()
    return AuthContext(user_id=user.id, email=user.email)


# -----------------------------------------------------------------------------#
# FastAPI dependency — RED-7 cookie OR bearer fallback
# -----------------------------------------------------------------------------#


async def get_current_user(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    session: AsyncSession = Depends(get_session),
) -> AuthContext:
    """Validate session cookie OR bearer credentials, return AuthContext.

    Resolution order:
      1. Session cookie (production path; HttpOnly, sent by browser)
      2. Authorization: Bearer (dev / CI / API consumers)
         a. Static bearer
         b. JWT

    Sprint 38 RED-7: cookie path is now the production primary; bearer
    fallback preserved for compatibility with scripts / Postman / CI.
    """
    settings = get_settings()

    # 1) Cookie path — RED-7 production.
    cookie_token = request.cookies.get(settings.session_cookie_name)
    if cookie_token:
        return await _resolve_jwt_user(cookie_token, session)

    # 2) Bearer fallback — dev / CI / API consumers.
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing session cookie or bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if creds.credentials == settings.bearer_token:
        return await _resolve_dev_user(creds.credentials, session)

    return await _resolve_jwt_user(creds.credentials, session)


async def get_current_user_optional(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    session: AsyncSession = Depends(get_session),
) -> AuthContext | None:
    """Same as get_current_user but returns None instead of 401 when no
    credentials are provided. Used by endpoints that personalize when
    authed but don't require auth."""
    settings = get_settings()

    # Cookie path
    cookie_token = request.cookies.get(settings.session_cookie_name)
    if cookie_token:
        try:
            return await _resolve_jwt_user(cookie_token, session)
        except HTTPException:
            return None

    # Bearer fallback
    if creds is None or creds.scheme.lower() != "bearer":
        return None
    if creds.credentials == settings.bearer_token:
        return await _resolve_dev_user(creds.credentials, session)
    try:
        return await _resolve_jwt_user(creds.credentials, session)
    except HTTPException:
        return None
