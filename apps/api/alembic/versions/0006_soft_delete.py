"""Alembic migration: soft-delete column on users.

Per docs/decisions/D19 §deletion. DELETE /users/me now soft-deletes
(sets ``deleted_at``) instead of hard-deleting immediately. A daily
cron hard-deletes rows where ``deleted_at`` is older than the grace
period (default 7 days). Re-login during the grace period restores
the account (clears ``deleted_at``) — see apps/api/calisthenics_api/auth.py.

0006_soft_delete
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0006_soft_delete"
down_revision = "0004_friendships"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "deleted_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    # Lookup query for the daily purge job: WHERE deleted_at < cutoff.
    op.create_index(
        "ix_users_deleted_at",
        "users",
        ["deleted_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_users_deleted_at", table_name="users")
    op.drop_column("users", "deleted_at")