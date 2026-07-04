"""Auth endpoints (Phase 2) — magic-link + JWT.

POST /api/v1/auth/magic-link   — request a sign-in link via email
GET  /api/v1/auth/verify       — consume a magic-link token, issue JWT pair
POST /api/v1/auth/refresh      — exchange a refresh token for a fresh JWT pair

Dev mode (POSTMARK_TOKEN unset): the magic-link token is logged to stdout AND
returned in the response under `dev_token` so local development doesn't need
a working email pipeline.
"""

from __future__ import annotations

import hashlib
import logging
import uuid
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from calisthenics_api import security
from calisthenics_api.auth import (
    clear_session_cookie,
    get_current_user,
    set_session_cookie,
)
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

    Sprint 39 P2: uses Postmark's transactional REST API directly via
    httpx instead of pulling the `postmarker` (or `postmark`) PyPI
    package. Both names on PyPI are stale placeholders or unrelated
    forks; the official SDK is an openapi-generator auto-built artifact
    that requires `urllib3` + a vendored api_client. A direct POST to
    `https://api.postmarkapp.com/email` with the JSON shape from
    https://postmarkapp.com/developer/api/email-api is one request,
    zero deps beyond `httpx` (already a project dep), and matches the
    audit team's request: no extra packages, no version surprises.
    """
    settings = get_settings()
    if not settings.postmark_token:
        # Dev fallback — log to stdout so devs can copy the link from the API logs.
        # Sprint 38 YELLOW: log the link WITH the token only when POSTMARK is
        # unset AND environment != production. In prod, refuse to log the link
        # even if dev-mode path triggers (e.g. operator forgot POSTMARK_TOKEN
        # in a prod env) — the audit's boot guard should prevent prod
        # startup, but defense in depth.
        if settings.environment != "production":
            logger.warning(
                "[dev-mode] Magic link for %s: %s "
                "(POSTMARK_TOKEN unset — set it in .env to send real emails)",
                to_email,
                link,
            )
        else:
            # Belt + suspenders: the boot guard already refused to start in
            # prod without POSTMARK_TOKEN. If we somehow reach this path, log
            # an error WITHOUT the link so we don't leak it via the prod log
            # aggregator.
            link_token_fpr = hashlib.sha256(link.encode("utf-8")).hexdigest()[:12]
            logger.error(
                "PROD reached dev-mode magic-link path with POSTMARK_TOKEN unset "
                "— link suppressed. link_token_fpr=%s",
                link_token_fpr,
            )
        return

    # Direct REST call. Postmark's transactional endpoint accepts JSON
    # exactly like this. Raise on non-2xx so the caller's outer
    # try/except logs the failure with token_fpr (no PII).
    expiry_minutes = settings.magic_link_ttl_secs // 60
    payload = {
        "From": settings.postmark_from_email,
        "To": to_email,
        "Subject": "Sign in to Calisthenics Tree",
        "HtmlBody": render_magic_link_html(link, expiry_minutes),
        "TextBody": render_magic_link_text(link, expiry_minutes),
        "MessageStream": "outbound",
    }
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": settings.postmark_token,
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            "https://api.postmarkapp.com/email",
            json=payload,
            headers=headers,
        )
    if response.status_code >= 300:
        raise RuntimeError(
            f"Postmark returned {response.status_code}: {response.text[:200]}"
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
        # Sprint 38 YELLOW: log a SHA-256 prefix of the token instead of
        # the raw token (PII in observability cluster). NEVER log the full
        # link / token — even in dev mode, log aggregation can be retained
        # longer than the token's 15-min TTL.
        token_fpr = hashlib.sha256(token.encode("utf-8")).hexdigest()[:12]
        logger.exception(
            "Failed to send magic link (token_fpr=%s): %s",
            token_fpr,
            exc,
        )

    # Audit INFO: log request without the link or token. Hash the email for
    # join-back. We do NOT log the token or the link in any path — neither
    # info-log nor the dev-mode path. Dev mode exposes dev_token in the
    # HTTP response body only (Sprint 37 RED-1 fix); stdout never sees it.
    email_fpr = hashlib.sha256(email.encode("utf-8")).hexdigest()[:12]
    logger.info(
        "Magic link issued (email_fpr=%s, sent_via=%s)",
        email_fpr,
        "postmark" if settings.postmark_token else "stdout-dev",
    )

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


@router.get("/verify", response_model=VerifyResponse, dependencies=[Depends(rate_limit_per_ip("verify"))])
async def verify_magic_link(
    response: Response,  # Sprint 38 RED-7: Set-Cookie target
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
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()

    user = await _get_or_create_user(email, session)

    # Check + insert in one transaction so two concurrent verifies can't
    # both succeed. IntegrityError on the second insert is the "already
    # used" signal.
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

    # Sprint 38 RED-7: Set the session cookies alongside the JSON response.
    # The browser now carries both tokens in HttpOnly+Secure+SameSite=Lax
    # cookies. The SPA never sees them in JS — /auth/whoami hydrates on
    # mount and /auth/refresh rotates the cookies via a cookieless POST.
    # Tokens STILL appear in the JSON body for backward compat with
    # scripts / Postman; the SPA ignores them.
    from calisthenics_api.auth import set_session_cookie  # local import to avoid cycle

    set_session_cookie(
        response,
        access_token=tokens["access_token"],  # type: ignore[arg-type]
        refresh_token=tokens["refresh_token"],  # type: ignore[arg-type]
    )

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
    response: Response,  # Sprint 38 RED-7: rotate the session cookie
    payload: RefreshRequest | None = None,
    request: Request = None,  # type: ignore[assignment]
    session: AsyncSession = Depends(get_session),
) -> RefreshResponse:
    """Exchange a refresh token for a fresh access+refresh pair (rotation).

    Sprint 38 RED-7: prefers the refresh token from the `ct_session_refresh`
    cookie (set by /auth/verify when the SPA is in cookie mode). Falls back
    to the JSON body's `refresh_token` for scripts/Postman that can't carry
    cookies. The response both updates the cookie AND echoes the JSON so
    both surfaces continue to work.
    """
    settings = get_settings()
    # Cookie path first (production). The body field is optional.
    refresh_token = None
    if request is not None:
        refresh_token = request.cookies.get(settings.session_cookie_refresh_name)
    if not refresh_token and payload is not None and payload.refresh_token:
        refresh_token = payload.refresh_token
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token.",
        )

    try:
        claims = security.decode_jwt(refresh_token, expected_typ="refresh")
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

    # Sprint 38 RED-7: rotate BOTH cookies so the SPA stays signed in
    # without juggling any tokens client-side. Only when the cookie was
    # actually used by the request — JSON-token callers (legacy / scripts)
    # shouldn't get cookies planted on them.
    refresh_cookie_present = (
        request is not None
        and request.cookies.get(settings.session_cookie_refresh_name) is not None
    )
    set_session_cookie(
        response,
        access_token=tokens["access_token"],  # type: ignore[arg-type]
        refresh_token=tokens["refresh_token"] if refresh_cookie_present else None,  # type: ignore[arg-type]
        settings=settings,
    )

    return RefreshResponse(
        access_token=tokens["access_token"],  # type: ignore[arg-type]
        access_expires_at=tokens["access_expires_at"],  # type: ignore[arg-type]
        refresh_token=tokens["refresh_token"],  # type: ignore[arg-type]
        refresh_expires_at=tokens["refresh_expires_at"],  # type: ignore[arg-type]
    )


# -----------------------------------------------------------------------------#
# POST /api/v1/auth/signout
# -----------------------------------------------------------------------------#


@router.post("/signout", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(rate_limit_per_ip("signout"))])
async def signout(response: Response) -> Response:
    """Sprint 38 RED-7: clear the session cookies.

    Idempotent — 204 whether or not a cookie was actually set. No DB write
    needed (the JWT inside the cookie is still cryptographically valid
    until exp; the cookie deletion makes the browser stop sending it).

    Sprint 39 P1: rate-limited per IP. The endpoint is anonymous (no auth
    required) so an attacker could spam it to create auth churn on
    legitimate clients' browsers. Cheap to gate.
    """
    clear_session_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


# -----------------------------------------------------------------------------#
# GET /api/v1/auth/whoami
# -----------------------------------------------------------------------------#


@router.get("/whoami", response_model=UserPublic)
async def whoami(
    user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> UserPublic:
    """Sprint 38 RED-7: hydrate the SPA from the cookie.

    Returns the current user if the session cookie (or bearer) is valid,
    401 otherwise. The SPA calls this on mount via `credentials: 'include'`
    so it can re-attach the authenticated view after a hard refresh.
    HttpOnly cookies can't be read from JS, hence the dedicated endpoint.
    """
    # user is AuthContext; fetch the User row so we return UserPublic
    user_uuid = user.user_id
    result = await session.execute(select(User).where(User.id == user_uuid))
    db_user = result.scalar_one_or_none()
    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists.",
        )
    return UserPublic.model_validate(db_user)