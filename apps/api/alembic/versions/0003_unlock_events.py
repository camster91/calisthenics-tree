"""Alembic migration: add unlock_events table.

P4 social feed foundation. One row per promotion/regression returned
from /api/v1/workouts/sync. The feed endpoint reads from this table.
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0003_unlock_events"
down_revision = "0002_user_display_name"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "unlock_events",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.func.gen_random_uuid()),
        sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tree_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("progression_trees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("new_node_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("progression_nodes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("trigger", sa.String(length=20), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_unlock_events_user_time",
        "unlock_events",
        ["user_id", "occurred_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_unlock_events_user_time", table_name="unlock_events")
    op.drop_table("unlock_events")