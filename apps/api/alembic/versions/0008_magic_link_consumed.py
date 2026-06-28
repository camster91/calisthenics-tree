"""Magic-link consumed-nonce tracking — Sprint 38 hardening RED-6.

Adds a `magic_link_consumed` table that records (token_hash, consumed_at).
Every successful /auth/verify now checks + inserts in the same transaction.
This closes the 15-min replay window: an intercepted magic-link URL is
valid for exactly one verify call, regardless of TTL.

Down_revision = 0007_placeholder (see that file for why the chain skips
through 0005_placeholder instead of jumping straight from 0006).

Operational note: this table only grows by one row per magic-link consume,
so it's tiny. No TTL purge needed — old consumed nonces stay forever as a
defensive audit trail. Add an autouse purge later if it ever becomes a
storage concern.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "0008_magic_link_consumed"
down_revision = "0007_placeholder"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "magic_link_consumed",
        sa.Column(
            "token_hash",
            sa.String(length=128),
            primary_key=True,
            nullable=False,
            comment=(
                "SHA-256 hex of the magic-link token. We store the hash, not the "
                "token itself, so a DB dump doesn't leak live magic links."
            ),
        ),
        sa.Column(
            "consumed_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    # Composite index on (user_id, consumed_at DESC) for "when did this user
    # last use a magic link" queries (rate-limit visibility + future audit UI).
    op.create_index(
        "ix_magic_link_consumed_user_time",
        "magic_link_consumed",
        ["user_id", sa.text("consumed_at DESC")],
    )


def downgrade() -> None:
    op.drop_index("ix_magic_link_consumed_user_time", table_name="magic_link_consumed")
    op.drop_table("magic_link_consumed")