"""Bearer token / JWT auth dependency.

Phase 1 used a single shared bearer token (env: BEARER_TOKEN). Phase 2 adds
JWT verification (HS256). Both are accepted — the bearer path is preserved
for local dev / CI / Postman, JWT is the production path.

Auth flow on a request:
  1. Inspect Authorization: Bearer <credentials>
  2. Try static bearer (matches settings.bearer_token) → dev user
  3. Try JWT verification (HS256, expected typ=access) → resolve user_id
  4. Otherwise 401
"""

from __future__ import annotations

import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from calisthenics_api import security
from calisthenics_api.config import get_settings
from calisthenics_api.db import get_session
from calisthenics_api.db.models import User
from calisthenics_api.schemas import AuthContext

_bearer_scheme = HTTPBearer(auto_error=False)


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
    return AuthContext(user_id=user.id, email=user.email)


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    session: AsyncSession = Depends(get_session),
) -> AuthContext:
    """Validate bearer credentials (static token OR JWT) and resolve to AuthContext.

    Order: static bearer first (cheap string compare) → JWT fallback.
    Both paths return the same AuthContext shape, so downstream routes don't
    care which auth method was used.
    """
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    settings = get_settings()

    # Static bearer path (dev / CI / smoke tests). Skip JWT decode entirely
    # when the credentials match the configured dev token.
    if creds.credentials == settings.bearer_token:
        return await _resolve_dev_user(creds.credentials, session)

    # JWT path (production).
    return await _resolve_jwt_user(creds.credentials, session)
