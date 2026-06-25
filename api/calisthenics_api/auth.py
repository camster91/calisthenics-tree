"""Bearer token auth dependency.

For Phase 1 we use a single shared bearer token (env: BEARER_TOKEN). It maps
to a single demo user. This is deliberately simple — production will swap in
JWT verification (Supabase or similar) without changing route signatures.
"""

from __future__ import annotations

import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from calisthenics_api.config import get_settings
from calisthenics_api.db import get_session
from calisthenics_api.db.models import User
from calisthenics_api.schemas import AuthContext

_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    session: AsyncSession = Depends(get_session),
) -> AuthContext:
    """Validate bearer token and resolve to a User row.

    For Phase 1 the dev user is created on first access with a stable UUID
    derived from the bearer token. The token is also in plain settings —
    this is acceptable for dev only.
    """
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    settings = get_settings()
    if creds.credentials != settings.bearer_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Stable UUID per token so re-runs don't fragment user data
    user_email = f"dev+{creds.credentials[:8]}@calisthenics.local"
    result = await session.execute(select(User).where(User.email == user_email))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(id=uuid.uuid5(uuid.NAMESPACE_DNS, f"calisthenics:{creds.credentials}"), email=user_email)
        session.add(user)
        await session.flush()
    return AuthContext(user_id=user.id, email=user.email)
