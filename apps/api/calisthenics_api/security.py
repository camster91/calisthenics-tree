"""Auth crypto helpers — JWT issue/verify + magic-link token sign/verify.

Phase 1 used a single static bearer token (BEARER_TOKEN). Phase 2 introduces:

- **Magic-link tokens**: short-lived (default 15min), signed with itsdangerous's
  URL-safe serializer. Sent via email. **Single-use IS enforced** (Sprint 38
  RED-6): the SHA-256 of the consumed token is inserted into the
  `magic_link_consumed` table in the same transaction as the JWT pair issuance,
  so a second verify call with the same token returns 400.

- **Access JWTs**: HS256, default 1h TTL, carry user_id + email. Carried in the
  Authorization: Bearer header on every authenticated request. Short TTL so a
  leaked token expires fast.

- **Refresh JWTs**: HS256, default 30 days. Same shape as access but a distinct
  `typ: refresh` claim so they can't be substituted for access tokens at the
  API gateway. The /auth/refresh endpoint rotates (issues a new pair + invalidates
  the old refresh via jti tracking would require DB; for v1 we accept that a
  refresh token remains valid until its exp — acceptable trade-off given the
  short access TTL).

Both secret values live in Settings (config.py). Dev defaults are obvious-fake
placeholders; production MUST override via env (see apps/api/.env.example).
"""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal

import jwt
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from calisthenics_api.config import get_settings


# -----------------------------------------------------------------------------#
# Magic-link tokens (itsdangerous)
# -----------------------------------------------------------------------------#


def _magic_serializer() -> URLSafeTimedSerializer:
    """Build a fresh serializer. Cheap; cached implicitly via get_settings."""
    return URLSafeTimedSerializer(get_settings().magic_link_secret, salt="magic-link")


def issue_magic_link_token(email: str) -> tuple[str, datetime]:
    """Return (signed_token, expires_at).

    The token embeds the email + a random nonce. The nonce lets us detect
    accidental token reuse if we ever decide to log them.
    """
    nonce = secrets.token_urlsafe(8)
    payload = {"email": email.lower(), "nonce": nonce}
    token = _magic_serializer().dumps(payload)
    expires = datetime.now(timezone.utc) + timedelta(seconds=get_settings().magic_link_ttl_secs)
    return token, expires


def verify_magic_link_token(token: str) -> str:
    """Return the email encoded in `token`, or raise ValueError on bad/expired."""
    settings = get_settings()
    try:
        payload = _magic_serializer().loads(token, max_age=settings.magic_link_ttl_secs)
    except SignatureExpired as exc:
        raise ValueError("Magic link expired. Request a new one.") from exc
    except BadSignature as exc:
        raise ValueError("Magic link invalid.") from exc
    email = payload.get("email")
    if not isinstance(email, str) or "@" not in email:
        raise ValueError("Magic link payload malformed.")
    return email


# -----------------------------------------------------------------------------#
# JWTs (PyJWT, HS256)
# -----------------------------------------------------------------------------#


TokenType = Literal["access", "refresh"]


def _encode_jwt(
    *,
    user_id: str,
    email: str,
    typ: TokenType,
    ttl_secs: int,
) -> tuple[str, datetime]:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    exp = now + timedelta(seconds=ttl_secs)
    payload = {
        "sub": user_id,  # subject = user UUID (string form)
        "email": email,
        "typ": typ,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "jti": secrets.token_urlsafe(12),  # unique token id (audit / future revocation)
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, exp


def decode_jwt(token: str, *, expected_typ: TokenType) -> dict:
    """Decode + verify a JWT. Raises ValueError on any failure.

    Callers should distinguish "expired" from "invalid" for friendlier UX; for
    v1 we collapse both to a single 401 with a generic message.
    """
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            options={"require": ["exp", "iat", "sub", "typ"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise ValueError("Token expired.") from exc
    except jwt.InvalidTokenError as exc:
        raise ValueError("Token invalid.") from exc
    if payload.get("typ") != expected_typ:
        raise ValueError(f"Wrong token type: expected {expected_typ}, got {payload.get('typ')}")
    return payload


def issue_access_token(*, user_id: str, email: str) -> tuple[str, datetime]:
    return _encode_jwt(
        user_id=user_id,
        email=email,
        typ="access",
        ttl_secs=get_settings().jwt_access_ttl_secs,
    )


def issue_refresh_token(*, user_id: str, email: str) -> tuple[str, datetime]:
    return _encode_jwt(
        user_id=user_id,
        email=email,
        typ="refresh",
        ttl_secs=get_settings().jwt_refresh_ttl_secs,
    )


def issue_token_pair(*, user_id: str, email: str) -> dict[str, str | datetime]:
    """Issue a fresh access+refresh pair. Used by /auth/verify and /auth/refresh."""
    access, access_exp = issue_access_token(user_id=user_id, email=email)
    refresh, refresh_exp = issue_refresh_token(user_id=user_id, email=email)
    return {
        "access_token": access,
        "access_expires_at": access_exp,
        "refresh_token": refresh,
        "refresh_expires_at": refresh_exp,
    }