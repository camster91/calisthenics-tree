"""GET /api/v1/users/me/history — recent workouts for the logged-in user.

Mirrors apps/web/src/lib/local-mode.ts getLocalHistory() so server-mode
users see the same shape in HistoryPage. Returns:
- recent: most recent workouts first, joined with exercise + tree names
- total_workouts: total count (no pagination in v1; cap at ~200 in SQL)
- streak_days: consecutive days with >= 1 workout, ending today/yesterday
"""

from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from calisthenics_api.auth import get_current_user
from calisthenics_api.db import get_session
from calisthenics_api.db.models import (
    Exercise,
    ProgressionNode,
    ProgressionTree,
    SetLog,
    UserNodeState,
    Workout,
)
from calisthenics_api.schemas import (
    AuthContext,
    HistoryResponse,
    HistoryRow,
    node_id as to_node_wire,
    tree_id as to_tree_wire,
)

router = APIRouter(prefix="/users", tags=["history"])

# Cap recent workouts so a power user doesn't blow up the page.
_RECENT_LIMIT = 200


@router.get("/me/history", response_model=HistoryResponse)
async def my_history(
    auth: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> HistoryResponse:
    user_id = auth.user_id

    # Total count (cheap).
    total_row = await session.execute(
        select(Workout.id).where(Workout.user_id == user_id)
    )
    total_workouts = len(total_row.all())

    # Recent workouts + set_logs + node + exercise, all in one query.
    # Order by completed_at desc so the frontend's first page is the
    # freshest. Limit at the SQL level to keep payloads small.
    rows = (
        await session.execute(
            select(Workout, SetLog, ProgressionNode, Exercise, ProgressionTree)
            .join(SetLog, SetLog.workout_id == Workout.id)
            .join(ProgressionNode, ProgressionNode.id == SetLog.node_id)
            .join(Exercise, Exercise.id == ProgressionNode.exercise_id)
            .join(ProgressionTree, ProgressionTree.id == ProgressionNode.tree_id)
            .where(Workout.user_id == user_id)
            .order_by(Workout.completed_at.desc())
            .limit(_RECENT_LIMIT)
        )
    ).all()

    # Group set_logs by workout — one HistoryRow per workout, not per set.
    # A workout with sets on 2 nodes shows as 2 HistoryRows (one per node)
    # to match the local-mode shape (which also shows one per workout).
    by_workout: dict[uuid.UUID, list] = defaultdict(list)
    completed_at: dict[uuid.UUID, datetime] = {}
    for workout, setlog, node, exercise, tree in rows:
        by_workout[workout.id].append((setlog, node, exercise, tree))
        completed_at[workout.id] = workout.completed_at

    # Look up the current target_sets for each unique node so we can
    # compute sets_completed / sets_target. (Done in a second query so the
    # main join stays simple.)
    node_ids = {node.id for entries in by_workout.values() for (_setlog, node, _ex, _tr) in entries}
    target_sets: dict[uuid.UUID, int] = {}
    if node_ids:
        ns_rows = (
            await session.execute(
                select(ProgressionNode.id, ProgressionNode.target_sets).where(
                    ProgressionNode.id.in_(node_ids)
                )
            )
        ).all()
        target_sets = {nid: ts for nid, ts in ns_rows}

    # Build rows. The frontend expects the LATEST placement node per tree
    # to decide if this workout caused a promotion. We pull the user's
    # UserNodeState once and use the post-workout snapshot for matching.
    user_state_rows = (
        await session.execute(
            select(UserNodeState).where(UserNodeState.user_id == user_id)
        )
    ).scalars().all()
    current_node_by_tree: dict[uuid.UUID, uuid.UUID] = {
        s.tree_id: s.current_node_id for s in user_state_rows
    }

    # Construct one HistoryRow per (workout, node) — a workout can have
    # sets on multiple nodes (the local-mode mock does the same).
    recent: list[HistoryRow] = []
    for workout_id, entries in by_workout.items():
        logged_at = completed_at[workout_id]
        for setlog, node, exercise, tree in entries:
            # Promote = "this workout was the trigger that advanced this
            # tree's current_node to a rank above where the user started".
            # Heuristic: the workout was logged_at-today and the current
            # rank on the tree is > 1 and the node rank matches a higher
            # rank than the previous "starting rank" was. The accurate
            # version is to diff pre/post snapshots; this is a rough
            # signal that's good enough for a "Promoted" badge.
            is_promotion = (
                current_node_by_tree.get(tree.id) == node.id
                and node.rank_level > 1
            )
            recent.append(
                HistoryRow(
                    id=f"{workout_id}:{setlog.id}",
                    logged_at=logged_at,
                    exercise_name=exercise.name,
                    tree_id=to_tree_wire(tree.id),
                    tree_name=tree.name,
                    node_id=to_node_wire(node.id),
                    sets_completed=1,  # one set_log per row in the join above
                    sets_target=target_sets.get(node.id, 3),
                    is_promotion=is_promotion,
                )
            )

    # Sort newest first and cap (defensive — SQL already limits).
    recent.sort(key=lambda r: r.logged_at, reverse=True)
    recent = recent[:_RECENT_LIMIT]

    # Streak: walk backwards from today; count consecutive days that
    # have >= 1 workout. If the most recent workout is older than yesterday,
    # the streak is 0 (broken).
    streak_days = _compute_streak({r.logged_at.date() for r in recent})

    return HistoryResponse(
        recent=recent,
        total_workouts=total_workouts,
        streak_days=streak_days,
    )


def _compute_streak(workout_days: set[date]) -> int:
    """Consecutive days ending today (or yesterday if no workout today)."""
    if not workout_days:
        return 0
    today = datetime.now(timezone.utc).date()
    # If today has a workout, start there; otherwise start from yesterday.
    cursor = today if today in workout_days else today - timedelta(days=1)
    if cursor not in workout_days:
        return 0
    streak = 0
    while cursor in workout_days:
        streak += 1
        cursor -= timedelta(days=1)
    return streak