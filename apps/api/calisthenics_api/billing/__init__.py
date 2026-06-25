"""Billing / payment provider abstraction.

The API surface for paywall flows is provider-agnostic. This package
defines a ``PaymentProvider`` ABC and ships a ``NullProvider``
implementation that responds to every method with a clear
"not-configured" signal. Real providers (Stripe, StoreKit, etc.) are
added in follow-up sprints — drop a new class next to ``NullProvider``
and register it in ``calisthenics_api.billing.registry.get_provider``.

Webhook entrypoint (``POST /api/v1/billing/webhook``) accepts a raw
JSON payload + provider-specific signature header and delegates
parsing to the active provider. The provider returns a
``WebhookEvent`` which the route handler maps onto user state.
"""

from __future__ import annotations

from .provider import NullProvider, PaymentProvider
from .registry import get_provider
from .types import CheckoutSession, WebhookEvent

__all__ = [
    "CheckoutSession",
    "NullProvider",
    "PaymentProvider",
    "WebhookEvent",
    "get_provider",
]