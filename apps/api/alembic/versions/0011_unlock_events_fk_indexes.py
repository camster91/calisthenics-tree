"""Sprint 41 perf — add FK indexes on unlock_events for feed JOIN performance.

The /feed endpoint joins progression_trees + progression_nodes on
unlock_events.tree_id and unlock_events.new_node_id. Today there's only
the (user_id, occurred_at) composite index for the user's own feed.
Once a popular user's unlock fan-out hits 5-10k rows, every feed request
that pulls IN (self, follows...) does a sequential scan on unlock_events
and a merge hash join on the FK columns.

Adds two indexes:
- ix_unlock_events_tree (tree_id) — JOIN progression_trees
- ix_unlock_events_node (new_node_id) — JOIN progression_nodes

Both indexes are pure adds (CONCURRENTLY not needed at this scale —
unlock_events is small even for a power user). Downgrade drops them.
"""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision = "0011_unlock_events_fk_indexes"
down_revision = "0010_legs_tree"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_unlock_events_tree",
        "unlock_events",
        ["tree_id"],
    )
    op.create_index(
        "ix_unlock_events_node",
        "unlock_events",
        ["new_node_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_unlock_events_node", table_name="unlock_events")
    op.drop_index("ix_unlock_events_tree", table_name="unlock_events")