"""Alembic migration: subscription fields on users (P5 scaffold).

Adds the columns we need to track paid state without coupling to a
specific payment provider. The provider-specific bits (Stripe customer
id, StoreKit original transaction id) are stored in a single
``subscription_external_id`` string — discriminator lives in
``subscription_provider``.

All columns except ``subscription_tier`` are nullable / default 'free'
so the migration is non-breaking for existing users.

0005_subscriptions
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0005_subscriptions"
down_revision = "0004_friendships"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "subscription_tier",
            sa.String(16),
            nullable=False,
            server_default="free",
        ),
    )
    op.add_column(
        "users",
        sa.Column("subscription_provider", sa.String(16), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "subscription_started_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "subscription_expires_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "subscription_cancel_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.add_column(
        "users",
        sa.Column("subscription_external_id", sa.String(255), nullable=True),
    )
    # Common query: who is currently paying? Composite index lets the
    # webhook handler fast-path 'is this user already active' before
    # doing a SELECT.
    op.create_index(
        "ix_users_subscription_tier_provider",
        "users",
        ["subscription_tier", "subscription_provider"],
    )


def downgrade() -> None:
    op.drop_index("ix_users_subscription_tier_provider", table_name="users")
    op.drop_column("users", "subscription_external_id")
    op.drop_column("users", "subscription_cancel_at")
    op.drop_column("users", "subscription_expires_at")
    op.drop_column("users", "subscription_started_at")
    op.drop_column("users", "subscription_provider")
    op.drop_column("users", "subscription_tier")