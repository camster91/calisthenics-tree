"""Placeholder migration — fills the gap left by Sprint 22 paywall teardown.

In Sprint 16-17 we shipped migration 0005_subscriptions (the paywall
scaffold). Sprint 22 fully tore down the paywall and DELETED 0005 from
the repo. The alembic chain then read:

  0001 → 0002 → 0003 → 0004 → (gap) → 0006_soft_delete

That gap is dangerous for backup-restore operations: a DB that was ever
stamped `0005_subscriptions` cannot run `alembic upgrade head` because
Alembic sees 0005_subscriptions in alembic_version but cannot find a
matching `0006_soft_delete` in the script map (down_revision pointer
mismatch). Audit RED-8.

This placeholder makes the chain contiguous:

  0001 → 0002 → 0003 → 0004 → 0006_soft_delete → 0007_placeholder → 0008_magic_link_consumed

The placeholder is a NO-OP. It exists purely to give alembic a file to
discover after `0006_soft_delete`, so legacy DBs at version
`0006_soft_delete` or later upgrade cleanly.

Note: a DB stamped at the old `0005_subscriptions` will still fail
(`0005_placeholder.down_revision != 0005_subscriptions.revision`). To
recover such a DB, the operator must manually `alembic stamp 0006_soft_delete`
first, then `alembic upgrade head`. Document this in RUNBOOK §5.
"""

from __future__ import annotations

# revision identifiers, used by Alembic.
revision = "0007_placeholder"
down_revision = "0006_soft_delete"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # No-op. See module docstring for context.
    pass


def downgrade() -> None:
    # No-op (you can't downgrade through a no-op).
    pass