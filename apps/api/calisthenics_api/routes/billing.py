"""Billing endpoints (P5 paywall scaffold).

GET  /api/v1/billing/me        — current subscription state
POST /api/v1/billing/checkout  — initiate a checkout session
POST /api/v1/billing/cancel    — schedule cancellation at period end
POST /api/v1/billing/webhook   — receive provider events (raw body)

The actual provider integrations (Stripe, StoreKit) are pluggable via
``calisthenics_api.billing.get_provider``. By default this returns a
``NullProvider`` stub that responds with ``provider_configured=False``
so the route surfaces 503 — the contract is complete, no money moves.

Webhook signature verification is delegated to the provider; the route
returns 401 on signature mismatch (provider returns None).

Tier-gated features use ``calisthenics_api.auth.requires_tier`` (see
auth.py). Adding a new gated feature is one line in the route.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from calisthenics_api.auth import get_current_user
from calisthenics_api.billing import WebhookEvent, get_provider
from calisthenics_api.config import get_settings
from calisthenics_api.db import get_session
from calisthenics_api.db.models import Tier, User
from calisthenics_api.schemas import (
    AuthContext,
    BillingStatus,
    CancelResponse,
    CheckoutRequest,
    CheckoutResponse,
    PlanInfo,
    PlansResponse,
)

logger = logging.getLogger("calisthenics_api.billing")

router = APIRouter(prefix="/billing", tags=["billing"])


# -----------------------------------------------------------------------------#
# GET /api/v1/billing/me
# -----------------------------------------------------------------------------#


@router.get("/me", response_model=BillingStatus)
async def get_billing_status(
    auth: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> BillingStatus:
    """Return the current user's subscription state.

    Used by the web app's ``useSubscription()`` hook to decide which
    features to render and which paywall to show.
    """
    result = await session.execute(select(User).where(User.id == auth.user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    return BillingStatus.model_validate(user)


# -----------------------------------------------------------------------------#
# POST /api/v1/billing/checkout
# -----------------------------------------------------------------------------#


@router.post(
    "/checkout",
    response_model=CheckoutResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_checkout(
    payload: CheckoutRequest,
    auth: AuthContext = Depends(get_current_user),
) -> CheckoutResponse:
    """Begin a checkout flow.

    Returns a ``checkout_url`` the client should redirect the user to.
    When the active provider is ``NullProvider`` (default), returns
    503 with a clear "payments not enabled" message — the client
    should render an 'unavailable' state instead of crashing.
    """
    settings = get_settings()
    provider = get_provider(settings)
    base = settings.web_base_url.rstrip("/")
    success_url = f"{base}/billing/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{base}/pricing?canceled=1"

    session = provider.create_checkout_session(
        user_id=str(auth.user_id),
        user_email=auth.email,
        tier=payload.tier,
        success_url=success_url,
        cancel_url=cancel_url,
    )

    if not session.provider_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Payments are not configured on this environment. "
                "Set PAYMENT_PROVIDER to 'stripe' (or another supported id) "
                "and provide the matching API keys."
            ),
        )

    return CheckoutResponse(
        checkout_url=session.checkout_url,
        external_session_id=session.external_session_id,
        provider_configured=True,
    )


# -----------------------------------------------------------------------------#
# POST /api/v1/billing/cancel
# -----------------------------------------------------------------------------#


@router.post("/cancel", response_model=CancelResponse)
async def cancel_subscription(
    auth: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> CancelResponse:
    """Schedule cancellation at the end of the current paid period.

    For free users this is a no-op that returns
    ``effective_at=None`` — the user is already in the desired state.
    For paid users it sets ``subscription_cancel_at = expires_at`` so
    access continues until the current period ends, after which the
    provider's ``subscription_canceled`` webhook downgrades them to
    free.

    The endpoint is idempotent: calling it twice has no extra effect.
    """
    result = await session.execute(select(User).where(User.id == auth.user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    if user.subscription_tier == Tier.FREE:
        return CancelResponse(effective_at=None)

    effective = user.subscription_expires_at or datetime.now(timezone.utc)
    user.subscription_cancel_at = effective
    await session.flush()
    logger.info(
        "Scheduled cancellation for user_id=%s effective_at=%s",
        user.id,
        effective,
    )
    return CancelResponse(effective_at=effective)


# -----------------------------------------------------------------------------#
# GET /api/v1/billing/plans — public pricing list
# -----------------------------------------------------------------------------#


_PLANS_FEATURES = {
    "monthly": [
        "Unlimited workouts",
        "Full DAG visualization",
        "Personalized placement",
    ],
    "yearly": [
        "Everything in monthly",
        "Two months free vs monthly",
    ],
    "lifetime": [
        "Everything in yearly",
        "One-time payment, lifetime access",
        "Founders badge",
    ],
}


@router.get("/plans", response_model=PlansResponse)
async def list_plans() -> PlansResponse:
    """Return the current pricing table. Public — no auth.

    The pricing source of truth is the API, not the web build — when
    Cameron changes a price in deploy config, the paywall page picks
    it up on next deploy without a frontend rebuild.
    """
    settings = get_settings()
    return PlansResponse(
        plans=[
            PlanInfo(
                tier="monthly",
                price_cents=settings.price_monthly_cents,
                interval="month",
                features=_PLANS_FEATURES["monthly"],
            ),
            PlanInfo(
                tier="yearly",
                price_cents=settings.price_yearly_cents,
                interval="year",
                features=_PLANS_FEATURES["yearly"],
            ),
            PlanInfo(
                tier="lifetime",
                price_cents=settings.price_lifetime_cents,
                interval="one_time",
                features=_PLANS_FEATURES["lifetime"],
            ),
        ]
    )


# -----------------------------------------------------------------------------#
# POST /api/v1/billing/webhook — provider-agnostic
# -----------------------------------------------------------------------------#


def _apply_event_to_user(user: User, event: WebhookEvent) -> None:
    """Mutate ``user`` based on a normalized webhook event."""
    now = datetime.now(timezone.utc)
    if event.kind in ("checkout_completed", "subscription_renewed"):
        user.subscription_tier = event.tier or user.subscription_tier
        user.subscription_started_at = user.subscription_started_at or now
        # Recurring renewals push expires_at forward; lifetime keeps None.
        if event.tier == "lifetime":
            user.subscription_expires_at = None
        else:
            user.subscription_expires_at = event.expires_at or (
                now + timedelta(days=30)
            )
        user.subscription_cancel_at = None
    elif event.kind == "subscription_canceled":
        user.subscription_tier = Tier.FREE
        user.subscription_provider = None
        user.subscription_cancel_at = event.expires_at
        user.subscription_expires_at = event.expires_at
        user.subscription_external_id = None
    elif event.kind == "refunded":
        user.subscription_tier = Tier.FREE
        user.subscription_provider = None
        user.subscription_expires_at = None
        user.subscription_cancel_at = now


@router.post(
    "/webhook",
    status_code=status.HTTP_204_NO_CONTENT,
    include_in_schema=False,
)
async def receive_webhook(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Receive a payment-provider webhook.

    Body is raw bytes (signature schemes vary per provider). The
    provider parses + verifies the signature and returns a normalized
    ``WebhookEvent`` or ``None``. We then look up the user by
    ``subscription_external_id`` and apply the event.

    No auth on this endpoint — provider signature IS the auth. Keep
    the endpoint out of the OpenAPI schema to discourage accidental
    use as a public callback.
    """
    settings = get_settings()
    provider = get_provider(settings)

    payload = await request.body()
    # Stripe sends 'Stripe-Signature', App Store sends a JWS, etc.
    # The provider implementation knows what to look for. We pass
    # whatever signature-shaped header the request carried.
    signature = (
        request.headers.get("stripe-signature")
        or request.headers.get("x-billing-signature")
        or request.headers.get("authorization")
    )

    event = provider.parse_webhook(payload=payload, signature=signature)
    if event is None:
        # Signature mismatch or provider not configured. Don't leak
        # which — same 401 either way.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature.",
        )

    result = await session.execute(
        select(User).where(User.subscription_external_id == event.external_user_id)
    )
    user = result.scalar_one_or_none()
    if user is None:
        # Could be: (a) checkout started but user hasn't completed
        # onboarding yet, (b) webhook for a customer we never created.
        # Log and 204 so the provider stops retrying — out-of-band
        # reconciliation can pick these up.
        logger.warning(
            "Webhook %s for unknown external_user_id=%s — ignoring.",
            event.kind,
            event.external_user_id,
        )
        return

    _apply_event_to_user(user, event)
    logger.info(
        "Applied webhook %s (event_id=%s) to user_id=%s",
        event.kind,
        event.external_event_id,
        user.id,
    )