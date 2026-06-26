"""Rate limiting — in-memory sliding window per key.

Single-server deploy (Coolify on VPS, single api container) so an
in-memory dict is appropriate. If the api ever horizontally scales,
swap this for slowapi + Redis without touching call sites.

Use as a FastAPI dependency:

    @router.post("/auth/magic-link")
    async def request_magic_link(
        _rl: None = Depends(rate_limit_per_ip("magic_link")),
        payload: MagicLinkRequest,
    ):
        ...

The dependency raises HTTPException(429) with a Retry-After header
when the per-key limit is exceeded. Caller never needs to check
the result — the dep either passes (returns None) or raises.

Limits are configurable via settings:
  - rate_limit_magic_link_per_min  (default 5)
  - rate_limit_refresh_per_min     (default 30)

Tunables that matter:
  - Window is sliding: count requests in the last `window_secs`.
    Not fixed-bucket — bursts at window boundaries are allowed
    up to `limit` within any `window_secs` slice.
  - Key for "per IP" is the X-Forwarded-For header if present,
    else request.client.host. Behind Cloudflare/Caddy the
    X-Forwarded-For is the real client; raw socket IP is the
    edge proxy. Set `TRUST_FORWARDED_FOR=1` in prod env.
"""

from __future__ import annotations

import logging
import threading
import time
from collections import defaultdict, deque
from typing import Callable

from fastapi import Depends, HTTPException, Request, status

from calisthenics_api.config import Settings, get_settings

logger = logging.getLogger("calisthenics_api.rate_limit")

# Per-bucket sliding window. Each entry is a deque of timestamps (sec since
# epoch). When the deque length exceeds the limit within the window, the
# request is rejected.
_buckets: dict[str, deque[float]] = defaultdict(deque)
_buckets_lock = threading.Lock()


def _resolve_client_ip(request: Request, settings: Settings) -> str:
    """Resolve the client IP. Trusts X-Forwarded-For when configured
    to (default in prod: yes — we're behind Cloudflare/Caddy). Falls
    back to the socket peer otherwise.

    Returns 'unknown' if neither resolves (uvicorn test client, etc.)
    so all such callers share one bucket — coarse but correct.
    """
    if settings.trust_forwarded_for:
        xff = request.headers.get("x-forwarded-for")
        if xff:
            # First entry is the original client per RFC 7239 convention.
            return xff.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _check_and_record(key: str, limit: int, window_secs: int) -> None:
    """Sliding-window check. Raises 429 if the caller exceeds `limit`
    requests in the last `window_secs` seconds."""
    now = time.monotonic()
    cutoff = now - window_secs
    with _buckets_lock:
        bucket = _buckets[key]
        # Drop expired entries from the front. The deque stays sorted.
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if len(bucket) >= limit:
            # Compute Retry-After: time until the oldest entry expires.
            retry_after = max(1, int(bucket[0] + window_secs - now) + 1)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Rate limit exceeded: {limit} requests per "
                    f"{window_secs}s. Try again in {retry_after}s."
                ),
                headers={"Retry-After": str(retry_after)},
            )
        bucket.append(now)


def rate_limit_per_ip(
    bucket_name: str,
    limit_per_min: int | None = None,
    window_secs: int = 60,
) -> Callable:
    """Dependency factory: rate-limit requests by client IP.

    Args:
      bucket_name: short identifier for the limit (used in logs +
        the dependency key). E.g. "magic_link", "refresh".
      limit_per_min: requests allowed per `window_secs`. When None,
        reads from settings using `bucket_name` (rate_limit_<name>_per_min).
      window_secs: window length in seconds (default 60 = 1 minute).

    Returns a FastAPI dependency that raises 429 when the per-IP
    limit is exceeded.
    """

    def _dep(
        request: Request,
        settings: Settings = Depends(get_settings),
    ) -> None:
        limit = limit_per_min
        if limit is None:
            # Convention: rate_limit_<bucket_name>_per_min on Settings.
            limit = getattr(settings, f"rate_limit_{bucket_name}_per_min", 10)
        client_ip = _resolve_client_ip(request, settings)
        key = f"{bucket_name}:{client_ip}"
        try:
            _check_and_record(key, limit, window_secs)
        except HTTPException:
            # Log at INFO (not WARNING) — expected user behavior under
            # abuse, not a server fault. Include the bucket name so
            # Sentry/grouping can distinguish the limits.
            logger.info(
                "rate_limit hit bucket=%s ip=%s limit=%d/%ds",
                bucket_name,
                client_ip,
                limit,
                window_secs,
            )
            raise

    return _dep