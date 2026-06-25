"""POST /api/v1/onboarding/place — binary-search + RIR-2 placement for all trees.

Inserts a UserNodeState row per tree so subsequent calls to
GET /api/v1/users/me/progressions return the placed nodes.
"""

from __future__ import annotations

import uuid
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
from calisthenics_api.placement import (
    assess_archetype,
    place_user,
    rir2_placement,
)
from calisthenics_api.schemas import (
    AuthContext,
    OnboardingPlaceRequest,
    OnboardingPlaceResponse,
    TreePlacement,
    node_id as to_node_wire,
    tree_id as to_tree_wire,
)

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.post("/place", response_model=OnboardingPlaceResponse)
async def place(
    payload: OnboardingPlaceRequest,
    auth: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> OnboardingPlaceResponse:
    answers = {
        "can_pull_up": payload.answers.can_pull_up,
        "support_hold_15s": payload.answers.support_hold_15s,
        "active_hang_10s": payload.answers.active_hang_10s,
    }
    archetype = assess_archetype(answers)
    # rir2_placement is also called inside place_user; we re-call it here just
    # to surface the raw offset to the client in the response.
    offset = rir2_placement(payload.answers.rir2_pushup_reps)

    # Fetch all trees + their node ranks
    trees = (await session.execute(select(ProgressionTree))).scalars().all()
    placements: list[TreePlacement] = []

    for tree in trees:
        node_rows = (
            await session.execute(
                select(ProgressionNode, Exercise)
                .join(Exercise, Exercise.id == ProgressionNode.exercise_id)
                .where(ProgressionNode.tree_id == tree.id)
                .order_by(ProgressionNode.rank_level)
            )
        ).all()

        if not node_rows:
            continue

        # Build rank_level -> node_id map (and a name lookup for the response).
        # `place_user` is the pure function and assumes contiguity from 1..N —
        # if the seed has gaps, the pure function will raise ValueError, which
        # we surface to the operator as a 500 (it's a seed-data bug).
        nodes_by_rank: dict[int, uuid.UUID] = {n.rank_level: n.id for n, _e in node_rows}
        name_by_id: dict[uuid.UUID, str] = {n.id: e.name for n, e in node_rows}

        target_node_id = place_user(archetype, payload.answers.rir2_pushup_reps, nodes_by_rank)
        target_rank = next(r for r, nid in nodes_by_rank.items() if nid == target_node_id)

        # Persist user_node_state (upsert)
        existing = await session.execute(
            select(UserNodeState).where(
                UserNodeState.user_id == auth.user_id,
                UserNodeState.tree_id == tree.id,
            )
        )
        state = existing.scalar_one_or_none()
        if state is None:
            session.add(
                UserNodeState(
                    user_id=auth.user_id,
                    tree_id=tree.id,
                    current_node_id=target_node_id,
                    unlocked_at=datetime.now(timezone.utc),
                )
            )
        else:
            state.current_node_id = target_node_id
            state.unlocked_at = datetime.now(timezone.utc)

        placements.append(
            TreePlacement(
                tree_id=to_tree_wire(tree.id),
                tree_name=tree.name,
                starting_node_id=to_node_wire(target_node_id),
                starting_node_name=name_by_id[target_node_id],
                starting_rank=target_rank,
            )
        )

    return OnboardingPlaceResponse(
        archetype=archetype,  # type: ignore[arg-type]
        rir2_offset=offset,
        placements=placements,
    )
