"""POST /api/v1/_csp_report — Content-Security-Policy violation sink.

Receives CSP report-uri POSTs from the browser (Content-Type
application/csp-report or application/reports+json). We log the
violation server-side so we get a signal when the browser blocks
something we didn't expect (e.g. a CDN we forgot to allowlist).

This is a low-cardinality fire-and-forget endpoint:
- No auth required (CSP reports come from the browser, not the app).
- No rate limit (CSP reports are throttled by the browser; abuse is
  limited by the same 1/sec cap browsers enforce).
- No request validation beyond the bare minimum — we accept anything
  and dump it to stderr so it's visible in docker logs.

Sprint 39 YELLOW close-out — was missing entirely, so any CSP
violation was silently dropped by the browser.

Wire-up: Caddyfile adds `report-uri /api/_csp_report` to the
Content-Security-Policy header, and the route below proxies that to
this endpoint.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Request

router = APIRouter(prefix="/_csp_report", tags=["observability"])

_log = logging.getLogger(__name__)


@router.post("", include_in_schema=False)
async def csp_report(request: Request) -> dict[str, str]:
    """Accept a CSP violation report and log it.

    Browsers POST either:
    - application/csp-report with body `{"csp-report": {...}}`, or
    - application/reports+json (newer Reporting API) with `[]`.

    We don't care about the shape — just log the raw payload so we can
    grep docker logs for `csp-violation`.
    """
    try:
        body: Any = await request.json()
    except Exception:
        raw = (await request.body()).decode("utf-8", errors="replace")[:500]
        body = {"_raw": raw}

    # Pull the inner csp-report if present, otherwise log the envelope.
    payload = body.get("csp-report", body) if isinstance(body, dict) else body
    violated = payload.get("violated-directive") if isinstance(payload, dict) else None
    blocked = payload.get("blocked-uri") if isinstance(payload, dict) else None
    _log.warning(
        "csp-violation violated=%s blocked=%s payload=%s",
        violated,
        blocked,
        payload,
    )
    return {"status": "logged"}