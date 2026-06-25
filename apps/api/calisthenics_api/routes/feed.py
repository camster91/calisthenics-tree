"""GET /api/v1/feed — recent unlock events for the social feed.

Phase 4 (PLAN.md Path B — community/social DAG differentiation). For
now this returns the authed user's own recent unlock events. Friends /
follow graph lands in a follow-up; the response shape is the same so
the web UI doesn't change when friends ship.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

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
    User,
)
from calisthenics_api.schemas import AuthContext

router = APIRouter(prefix="/feed", tags=["feed"])


@router.get("", response_model=None)
async def get_feed(
    limit: int = Query(default=20, ge=1, le=100),
    auth: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Return the most recent unlock events for the authed user,
    newest first. Each entry joins in tree + node + exercise for display."""
    rows = (
        await session.execute(
            select(UnlockEvent, ProgressionTree, ProgressionNode, Exercise)
            .join(ProgressionTree, ProgressionTree.id == UnlockEvent.tree_id)
            .join(ProgressionNode, ProgressionNode.id == UnlockEvent.new_node_id)
            .join(Exercise, Exercise.id == ProgressionNode.exercise_id)
            .where(UnlockEvent.user_id == auth.user_id)
            .order_by(UnlockEvent.occurred_at.desc())
            .limit(limit)
        )
    ).all()

    items: list[dict] = []
    for ev, tree, node, exercise in rows:
        items.append(
            {
                "id": f"unlock_{ev.id}",
                "user": {
                    "id": f"usr_{auth.user_id}",
                    "email": auth.email,
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