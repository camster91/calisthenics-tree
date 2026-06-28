"""Auth endpoints (Phase 2) — magic-link + JWT.

POST /api/v1/auth/magic-link   — request a sign-in link via email
GET  /api/v1/auth/verify       — consume a magic-link token, issue JWT pair
POST /api/v1/auth/refresh      — exchange a refresh token for a fresh JWT pair

Dev mode (POSTMARK_TOKEN unset): the magic-link token is logged to stdout AND
returned in the response under `dev_token` so local development doesn't need
a working email pipeline.
"""

from __future__ import annotations

import logging
import uuid
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from calisthenics_api import security
from calisthenics_api.config import get_settings
from calisthenics_api.db import get_session
from calisthenics_api.db.models import User
from calisthenics_api.emails.magic_link import (
    render_magic_link_html,
    render_magic_link_text,
)
from calisthenics_api.rate_limit import rate_limit_per_ip
from calisthenics_api.schemas import (
    MagicLinkRequest,
    MagicLinkResponse,
    RefreshRequest,
    RefreshResponse,
    UserPublic,
    VerifyResponse,
)

logger = logging.getLogger("calisthenics_api.auth")

router = APIRouter(prefix="/auth", tags=["auth"])


# -----------------------------------------------------------------------------#
# POST /api/v1/auth/magic-link
# -----------------------------------------------------------------------------#


def _build_magic_link(token: str, settings) -> str:
    """Build the URL the user clicks in the email."""
    params = urlencode({"token": token})
    return f"{settings.web_base_url.rstrip('/')}/auth/verify?{params}"


async def _send_magic_link_email(to_email: str, link: str) -> None:
    """Send via Postmark when configured, otherwise log to stdout (dev).

    The `postmarker` package is OPTIONAL — only required when POSTMARK_TOKEN
    is set. We keep it out of the default dependency list so dev / CI don't
    need to install it. Add `postmarker>=1.0` to apps/api/pyproject.toml when
    you're ready to wire up real email.
    """
    settings = get_settings()
    if not settings.postmark_token:
        # Dev fallback — log to stdout so devs can copy the link from the API logs.
        logger.warning(
            "[dev-mode] Magic link for %s: %s "
            "(POSTMARK_TOKEN unset — set it in .env to send real emails)",
            to_email,
            link,
        )
        return

    try:
        from postmarker import PostmarkClient  # type: ignore[import-not-found]
    except ImportError as exc:
        raise RuntimeError(
            "POSTMARK_TOKEN is set but the 'postmarker' package is not installed. "
            "Add 'postmarker>=1.0' to apps/api/pyproject.toml or unset "
            "POSTMARK_TOKEN for dev."
        ) from exc

    client = PostmarkClient(server_token=settings.postmark_token)
    expiry_minutes = settings.magic_link_ttl_secs // 60
    client.send_email(
        From=settings.postmark_from_email,
        To=to_email,
        Subject="Sign in to Calisthenics Tree",
        HtmlBody=render_magic_link_html(link, expiry_minutes),
        TextBody=render_magic_link_text(link, expiry_minutes),
    )


@router.post(
    "/magic-link",
    response_model=MagicLinkResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(rate_limit_per_ip("magic_link"))],
)
async def request_magic_link(
    payload: MagicLinkRequest,
    session: AsyncSession = Depends(get_session),
) -> MagicLinkResponse:
    """Generate + send (or log) a magic-link token.

    Always returns 202 — we don't leak whether the email is registered.
    """
    settings = get_settings()
    email = payload.email.lower()
    token, expires_at = security.issue_magic_link_token(email)
    link = _build_magic_link(token, settings)

    try:
        await _send_magic_link_email(email, link)
    except Exception as exc:
        # Surface email-send failures in the logs but still 202 to the client
        # so the API doesn't leak which emails are deliverable.
        logger.exception("Failed to send magic link to %s: %s", email, exc)

    # Sprint 37 audit fix (RED-1): never return dev_token in production, even
    # if POSTMARK_TOKEN is unset. Returning the signed magic-link token in an
    # unauthenticated response is a one-shot account-takeover path: any caller
    # who can hit POST /auth/magic-link can mint a JWT pair for any email.
    # The boot guard in main.py refuses to start the server in prod without
    # POSTMARK_TOKEN, so this is belt-and-suspenders defense-in-depth.
    is_prod = settings.environment == "production"
    response = MagicLinkResponse(
        status="dev" if (not settings.postmark_token and not is_prod) else "sent",
        expires_at=expires_at,
        dev_token=token if (not settings.postmark_token and not is_prod) else None,
    )
    return response


# -----------------------------------------------------------------------------#
# GET /api/v1/auth/verify
# -----------------------------------------------------------------------------#


async def _get_or_create_user(email: str, session: AsyncSession) -> User:
    """Look up a user by email, or create one. Email is already lowercased."""
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(id=uuid.uuid4(), email=email)
        session.add(user)
        await session.flush()
    return user


@router.get("/verify", response_model=VerifyResponse)
async def verify_magic_link(
    token: str = Query(..., min_length=10, max_length=512),
    session: AsyncSession = Depends(get_session),
) -> VerifyResponse:
    """Consume a magic-link token. Returns a JWT pair + the user record.

    Sprint 38 hardening RED-6: magic-link is now single-use. We store the
    SHA-256 of the token in `magic_link_consumed` and 400 on any
    re-submission within the 15-minute TTL window. The token itself is
    never stored — only its hash — so a DB dump doesn't leak live magic
    links.
    """
    try:
        email = security.verify_magic_link_token(token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    # Hash the raw token to check / record consumption. Use SHA-256 hex —
    # 64 hex chars, fits the column (String(128) has headroom for algorithm
    # changes). sha256 is sufficient: this is an integrity check, not a
    # credential — even a rainbow table of every magic-link hash doesn't
    # help an attacker since the underlying token (signed via itsdangerous
    # HMAC) is still the actual credential.
    import hashlib

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()

    user = await _get_or_create_user(email, session)

    # Check + insert in one transaction so two concurrent verifies can't
    # both succeed. IntegrityError on the second insert is the "already
    # used" signal.
    from sqlalchemy.exc import IntegrityError

    from calisthenics_api.db.models import MagicLinkConsumed

    consumed = MagicLinkConsumed(token_hash=token_hash, user_id=user.id)
    session.add(consumed)
    try:
        await session.flush()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Magic link already used. Request a new one.",
        ) from None

    await session.commit()

    tokens = security.issue_token_pair(user_id=str(user.id), email=user.email)

    logger.info("Issued JWT pair for user_id=%s", user.id)

    return VerifyResponse(
        access_token=tokens["access_token"],  # type: ignore[arg-type]
        access_expires_at=tokens["access_expires_at"],  # type: ignore[arg-type]
        refresh_token=tokens["refresh_token"],  # type: ignore[arg-type]
        refresh_expires_at=tokens["refresh_expires_at"],  # type: ignore[arg-type]
        user=UserPublic.model_validate(user),
    )


# -----------------------------------------------------------------------------#
# POST /api/v1/auth/refresh
# -----------------------------------------------------------------------------#


@router.post("/refresh", response_model=RefreshResponse, dependencies=[Depends(rate_limit_per_ip("refresh"))])
async def refresh_tokens(
    payload: RefreshRequest,
    session: AsyncSession = Depends(get_session),
) -> RefreshResponse:
    """Exchange a refresh token for a fresh access+refresh pair (rotation)."""
    try:
        claims = security.decode_jwt(payload.refresh_token, expected_typ="refresh")
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    user_id = uuid.UUID(claims["sub"])
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists.",
        )

    tokens = security.issue_token_pair(user_id=str(user.id), email=user.email)
    return RefreshResponse(
        access_token=tokens["access_token"],  # type: ignore[arg-type]
        access_expires_at=tokens["access_expires_at"],  # type: ignore[arg-type]
        refresh_token=tokens["refresh_token"],  # type: ignore[arg-type]
        refresh_expires_at=tokens["refresh_expires_at"],  # type: ignore[arg-type]
    )