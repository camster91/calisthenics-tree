"""purge_deleted_accounts — daily hard-delete of expired soft-delete tombstones.

Per docs/decisions/D19 §deletion: "After 7 days: hard delete via arq job."
arq isn't wired (P5 deferred, Sprint 22), so we use a standalone
sync script run from cron / CI schedule.

Usage (from VPS, after deployment):

    cd /opt/calisthenicstree
    uv run --directory apps/api python -m calisthenics_api.maintenance.purge_deleted_accounts

Add to the host crontab:

    # Daily 03:17 UTC — purge soft-deleted accounts past grace period
    17 3 * * * cd /opt/calisthenicstree && uv run --directory apps/api python -m calisthenics_api.maintenance.purge_deleted_accounts >> /var/log/calisthenicstree/purge.log 2>&1

Idempotent: re-running in the same day finds zero candidates.
Reports counts to stdout (log line + exit code) for monitoring.

Imports intentionally use the same SQLAlchemy 2.0 async setup
the api uses — sharing the connection pool via get_engine() means
the script benefits from any pool tuning already in place.
"""

from __future__ import annotations

import asyncio
import logging
import sys
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, func, select

from calisthenics_api.config import get_settings
from calisthenics_api.db import get_engine, get_session_factory
from calisthenics_api.db.models import User

logger = logging.getLogger("calisthenics_api.maintenance")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

# Grace period per D19 §deletion: 7 days from soft-delete request.
# Hard-coded here (not in Settings) — this is a regulatory commitment,
# not a tunable. Change requires updating the user-facing copy in the
# Settings UI + the magic-link "deletion scheduled" email copy.
GRACE_PERIOD_DAYS = 7


async def purge_once() -> int:
    """Find users soft-deleted > GRACE_PERIOD_DAYS ago, hard-delete.

    Returns the number of accounts purged. The DB cascade (set on
    the User relationships) wipes workouts, set_logs, node_state,
    unlock_events, friendships, tendon_strain_scores in one DELETE.
    """
    settings = get_settings()
    engine = get_engine()
    cutoff = datetime.now(timezone.utc) - timedelta(days=GRACE_PERIOD_DAYS)

    factory = get_session_factory()
    purged_count = 0
    async with factory() as session:
        # First, find the candidates so we can log them before deletion.
        # deleted_at IS NOT NULL AND deleted_at < cutoff.
        candidates = (
            await session.execute(
                select(User.id, User.email, User.deleted_at).where(
                    User.deleted_at.is_not(None),
                    User.deleted_at < cutoff,
                )
            )
        ).all()

        if not candidates:
            logger.info(
                "purge_deleted_accounts: 0 candidates past %d-day grace (env=%s)",
                GRACE_PERIOD_DAYS,
                settings.environment,
            )
            return 0

        # Log each before deletion so an operator can grep for who was
        # nuked (audit trail). Keep the actual DELETE atomic.
        for user_id, email, deleted_at in candidates:
            logger.info(
                "purging user_id=%s email=%s deleted_at=%s",
                user_id,
                email,
                deleted_at,
            )

        result = await session.execute(
            delete(User).where(
                User.deleted_at.is_not(None),
                User.deleted_at < cutoff,
            )
        )
        purged_count = result.rowcount or 0
        await session.commit()

    logger.info(
        "purge_deleted_accounts: purged=%d cutoff=%s env=%s",
        purged_count,
        cutoff.isoformat(),
        settings.environment,
    )
    return purged_count


def main() -> int:
    """Cron-friendly entry point. Returns 0 on success regardless of
    candidate count (the operator's monitoring system reads stdout for
    the count, not the exit code). Returns 1 only on infrastructure
    errors (DB connection, etc.) so cron can alert.
    """
    try:
        purged = asyncio.run(purge_once())
        # Echo for cron capture / log scraping
        print(f"PURGED={purged}")
        return 0
    except Exception as exc:
        logger.exception("purge_deleted_accounts failed: %s", exc)
        return 1


if __name__ == "__main__":
    sys.exit(main())