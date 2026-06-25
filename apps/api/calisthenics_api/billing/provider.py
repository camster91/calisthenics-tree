"""Payment provider interface.

The shipping codebase only ships ``NullProvider`` — a no-op stub that
clearly reports "payments not configured" so the rest of the app can
be wired end-to-end without a real merchant account. To enable real
payments, add a new subclass here (Stripe, StoreKit, LemonSqueezy,
etc.) and register it in ``registry.py``.

Provider implementations should:
  - be safe to instantiate at app startup (no network calls in __init__)
  - accept ``settings`` in their constructor so secrets come from env
  - treat webhook signature verification as a hard requirement —
    returning ``None`` from ``parse_webhook`` when the signature is
    invalid (do NOT raise)
  - be deterministic in ``external_event_id`` so the route handler
    can dedupe replays
"""

from __future__ import annotations

import abc
import logging

from calisthenics_api.config import Settings

from .types import CheckoutSession, WebhookEvent

logger = logging.getLogger("calisthenics_api.billing")


class PaymentProvider(abc.ABC):
    """Abstract payment provider.

    Concrete implementations: ``NullProvider`` (default), ``StripeProvider`` (TODO).
    """

    name: str = "abstract"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    @abc.abstractmethod
    def create_checkout_session(
        self,
        *,
        user_id: str,
        user_email: str,
        tier: str,
        success_url: str,
        cancel_url: str,
    ) -> CheckoutSession:
        """Begin a checkout flow.

        For card-based providers (Stripe) this returns a Stripe-hosted
        checkout URL. For StoreKit this returns a sentinel indicating
        "use the native purchase sheet" (handled client-side; this
        method won't actually be called from the iOS app's StoreKit
        path — it only exists for the web checkout flow).

        Implementations MUST NOT raise on missing configuration — they
        should return a ``CheckoutSession(provider_configured=False)``
        and let the route return 503.
        """

    @abc.abstractmethod
    def parse_webhook(
        self,
        *,
        payload: bytes,
        signature: str | None,
    ) -> WebhookEvent | None:
        """Parse + verify a provider webhook payload.

        Returns ``None`` on signature mismatch / malformed payload so
        the route can 401 without raising. Returns a ``WebhookEvent``
        on success — the route handler is responsible for idempotency.
        """


class NullProvider(PaymentProvider):
    """No-op provider — used until a real one is wired in.

    Every method returns a clearly-marked "not configured" response
    so the API contract is complete but no real money moves.
    """

    name = "null"

    def create_checkout_session(
        self,
        *,
        user_id: str,
        user_email: str,
        tier: str,
        success_url: str,
        cancel_url: str,
    ) -> CheckoutSession:
        logger.info(
            "[null-provider] create_checkout_session called for user_id=%s tier=%s — "
            "returning 'not configured' so the route can 503.",
            user_id,
            tier,
        )
        return CheckoutSession(
            checkout_url="",
            external_session_id="",
            provider_configured=False,
        )

    def parse_webhook(
        self,
        *,
        payload: bytes,
        signature: str | None,
    ) -> WebhookEvent | None:
        logger.info(
            "[null-provider] parse_webhook called (payload=%d bytes) — returning None. "
            "Real provider not configured.",
            len(payload),
        )
        return None