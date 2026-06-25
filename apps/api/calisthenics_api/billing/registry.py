"""Payment provider registry.

Returns the active ``PaymentProvider`` based on
``settings.payment_provider`` (env: ``PAYMENT_PROVIDER``). The default
value ``null`` returns ``NullProvider`` — the no-op stub. Adding a
new provider means adding a branch to ``_build()`` and a new class in
``provider.py``; nothing else changes.

This is intentionally a function, not a global singleton, so tests
can override ``get_provider`` with ``app.dependency_overrides`` or
monkeypatch.
"""

from __future__ import annotations

from calisthenics_api.config import Settings

from .provider import NullProvider, PaymentProvider


def _build(settings: Settings) -> PaymentProvider:
    name = (settings.payment_provider or "null").lower()
    if name in ("", "null", "none", "off"):
        return NullProvider(settings)
    # Future: if name == "stripe": return StripeProvider(settings)
    # Future: if name == "storekit": return StoreKitProvider(settings)
    raise RuntimeError(
        f"Unknown PAYMENT_PROVIDER={name!r}. "
        "Supported: 'null' (default). Add a new branch when shipping a real provider."
    )


def get_provider(settings: Settings | None = None) -> PaymentProvider:
    """Return the active provider, lazily built from settings."""
    if settings is None:
        from calisthenics_api.config import get_settings
        settings = get_settings()
    return _build(settings)