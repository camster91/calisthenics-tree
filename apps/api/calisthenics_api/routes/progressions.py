"""GET /api/v1/users/me/progressions — return user's current node per tree."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from calisthenics_api.auth import get_current_user
from calisthenics_api.db import get_session
from calisthenics_api.db.models import (
    Exercise,
    ProgressionNode,
    ProgressionTree,
    UserNodeState,
)
from calisthenics_api.schemas import (
    ActiveProgression,
    AuthContext,
    CurrentNode,
    ProgressionsResponse,
    node_id as to_node_wire,
    tree_id as to_tree_wire,
    user_id as to_user_wire,
)

router = APIRouter(prefix="/users", tags=["progressions"])


@router.get("/me/progressions", response_model=ProgressionsResponse)
async def get_my_progressions(
    auth: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ProgressionsResponse:
    # Pull all (tree, current_node, exercise) rows the user is on
    stmt = (
        select(ProgressionTree, ProgressionNode, Exercise, UserNodeState)
        .join(UserNodeState, UserNodeState.tree_id == ProgressionTree.id)
        .join(ProgressionNode, ProgressionNode.id == UserNodeState.current_node_id)
        .join(Exercise, Exercise.id == ProgressionNode.exercise_id)
        .where(UserNodeState.user_id == auth.user_id)
    )
    rows = (await session.execute(stmt)).all()

    active: list[ActiveProgression] = []
    for tree, node, exercise, _state in rows:
        active.append(
            ActiveProgression(
                tree_id=to_tree_wire(tree.id),
                tree_name=tree.name,
                current_node=CurrentNode(
                    node_id=to_node_wire(node.id),
                    exercise_name=exercise.name,
                    movement_type=exercise.movement_type,  # type: ignore[arg-type]
                    target_sets=node.target_sets,
                    target_reps=node.target_reps,
                    target_hold_secs=node.target_hold_secs,
                ),
            )
        )

    return ProgressionsResponse(
        user_id=to_user_wire(auth.user_id),
        updated_at=datetime.now(timezone.utc),
        active_progressions=active,
    )
