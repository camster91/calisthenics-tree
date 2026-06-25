"""Alembic migration: friendships table.

P4 social follow graph. One-way edges; A follows B means B's unlock
events show up in A's feed.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0004_friendships"
down_revision = "0003_unlock_events"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "friendships",
        sa.Column("follower_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("followee_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("follower_id <> followee_id", name="ck_friendships_not_self"),
    )
    op.create_index(
        "ix_friendships_followee",
        "friendships",
        ["followee_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_friendships_followee", table_name="friendships")
    op.drop_table("friendships")