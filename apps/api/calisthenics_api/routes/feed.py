"""GET /api/v1/feed — recent unlock events for the social feed.

Phase 4 (PLAN.md Path B — community/social DAG differentiation). For
now this returns the authed user's own recent unlock events. Friends /
follow graph lands in a follow-up; the response shape is the same so
the web UI doesn't change when friends ship.
"""

from __future__ import annotations


from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from calisthenics_api.auth import get_current_user
from calisthenics_api.db import get_session
from calisthenics_api.db.models import (
    Exercise,
    ProgressionNode,
    ProgressionTree,
    UnlockEvent,
)
from calisthenics_api.schemas import AuthContext

router = APIRouter(prefix="/feed", tags=["feed"])


@router.get("", response_model=None)
async def get_feed(
    limit: int = Query(default=20, ge=1, le=100),
    auth: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Return the most recent unlock events for the authed user AND
    everyone they follow, merged by timestamp, newest first.

    One round-trip via UNION-like subquery — pulls a window of the
    most recent N from each side and merges in Python.
    """
    from calisthenics_api.db.models import Friendship, User as UserModel

    # Build the set of user_ids whose unlocks we want: self + everyone we follow.
    follow_rows = (
        await session.execute(
            select(Friendship.followee_id).where(
                Friendship.follower_id == auth.user_id
            )
        )
    ).all()
    target_user_ids = [auth.user_id] + [r[0] for r in follow_rows]

    if not target_user_ids:
        return {"items": []}

    # Pull the most recent `limit` unlock events for these users, joined.
    rows = (
        await session.execute(
            select(UnlockEvent, ProgressionTree, ProgressionNode, Exercise, UserModel)
            .join(ProgressionTree, ProgressionTree.id == UnlockEvent.tree_id)
            .join(ProgressionNode, ProgressionNode.id == UnlockEvent.new_node_id)
            .join(Exercise, Exercise.id == ProgressionNode.exercise_id)
            .join(UserModel, UserModel.id == UnlockEvent.user_id)
            .where(UnlockEvent.user_id.in_(target_user_ids))
            .order_by(UnlockEvent.occurred_at.desc())
            .limit(limit)
        )
    ).all()

    items: list[dict] = []
    for ev, tree, node, exercise, user in rows:
        items.append(
            {
                "id": f"unlock_{ev.id}",
                "user": {
                    "id": f"usr_{user.id}",
                    "email": user.email,
                    "display_name": user.display_name,
                },
                "tree_id": f"tree_{tree.id}",
                "tree_name": tree.name,
                "new_node_id": f"node_{node.id}",
                "new_node_name": exercise.name,
                "trigger": ev.trigger,
                "note": ev.note,
                "occurred_at": ev.occurred_at.isoformat(),
            }
        )

    return {"items": items}