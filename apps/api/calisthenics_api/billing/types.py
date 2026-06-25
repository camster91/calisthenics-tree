"""Shared dataclasses for the billing package.

Lives in its own module to break the circular import:
  - billing/__init__.py  wants to re-export them
  - billing/provider.py  wants to type-annotate against them
If they lived in __init__.py, provider.py would try to import them
mid-evaluation and fail.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Literal

__all__ = ["CheckoutSession", "WebhookEvent"]


@dataclass(frozen=True)
class CheckoutSession:
    """Result of ``PaymentProvider.create_checkout_session``.

    ``checkout_url`` is what the client should ``window.location`` to.
    ``external_session_id`` is the provider's id for this attempt
    (Stripe ``cs_test_...`` etc). When the provider is not configured
    we return ``provider_configured=False`` so the route can 503.
    """

    checkout_url: str
    external_session_id: str
    provider_configured: bool


@dataclass(frozen=True)
class WebhookEvent:
    """Normalized payment-provider event.

    The raw provider webhook (Stripe ``checkout.session.completed``,
    App Store Server Notification, etc.) is parsed into this shape so
    the route handler doesn't need to know provider specifics.

    ``kind`` is one of:
        - ``checkout_completed`` — first successful payment
        - ``subscription_renewed`` — recurring charge succeeded
        - ``subscription_canceled`` — user canceled (or sub expired)
        - ``refunded`` — charge reversed
    """

    kind: Literal[
        "checkout_completed",
        "subscription_renewed",
        "subscription_canceled",
        "refunded",
    ]
    external_user_id: str
    """Provider's stable id for the paying user — Stripe customer id
    (``cus_...``) or App Store original transaction id. The route
    handler resolves this to our ``users.subscription_external_id``."""
    tier: Literal["monthly", "yearly", "lifetime"] | None
    """Tier to apply on checkout_completed / subscription_renewed.
    ``None`` on cancel/refund events — caller uses user's existing tier."""
    expires_at: datetime | None
    """When the current paid period ends. ``None`` for lifetime or if
    provider doesn't supply this on a renewal."""
    external_event_id: str
    """Provider's id for this webhook event — used for idempotency."""