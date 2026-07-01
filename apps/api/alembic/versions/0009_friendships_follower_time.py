"""Friendships follower-time index — Sprint 40 audit.

Adds a covering composite index on (follower_id, created_at DESC) so
the bounded list-friends query (`/api/v1/friends`) skips the sort
step. Without this index, Postgres uses the PK (follower_id, followee_id)
to find the rows but has to sort them in-memory by created_at.

EXPLAIN ANALYZE on the unindexed query:
  Sort Method: quicksort Memory: 25kB
  Bitmap Heap Scan on friendships

After this migration:
  Index Scan Backward using ix_friendships_follower_time
  no Sort node in the plan

The PK (follower_id, followee_id) still enforces uniqueness + serves
prefix lookups; this new index only optimizes the ORDER BY created_at
case. Cheap to maintain because follow events are rare relative to
read traffic.

Operational note: adding an index on a small table (<10k rows) is
near-instant. On the production DB (currently ~10 rows), this
migration completes in well under 100ms.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "0009_friendships_follower_time"
down_revision = "0008_magic_link_consumed"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_friendships_follower_time",
        "friendships",
        ["follower_id", sa.text("created_at DESC")],
    )


def downgrade() -> None:
    op.drop_index("ix_friendships_follower_time", table_name="friendships")