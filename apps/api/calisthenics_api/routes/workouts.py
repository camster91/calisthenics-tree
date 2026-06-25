"""POST /api/v1/workouts/sync — batch sync offline-logged workouts.

For each workout (in client-submitted order):
1. Idempotency check on client_workout_id
2. Insert workout + set_logs
3. For each node in the workout, run evaluateSetSafety per set
4. If any set on a node fell below the min_fail_threshold, queue a regression
   in state_updates
5. For each node the user has sets on, run check_node_unlock_status; if it
   returns is_unlocked, queue a promotion

Returns a single aggregated state_updates block per the spec.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from calisthenics_api.auth import get_current_user
from calisthenics_api.db import get_session
from calisthenics_api.db.models import (
    Exercise,
    ProgressionEdge,
    ProgressionNode,
    SetLog,
    UnlockEvent,
    UserNodeState,
    Workout,
)
from calisthenics_api.schemas import (
    AuthContext,
    StateUpdate,
    StateUpdates,
    WorkoutsSyncRequest,
    WorkoutsSyncResponse,
    node_id as to_node_wire,
    tree_id as to_tree_wire,
)

router = APIRouter(prefix="/workouts", tags=["workouts"])


@router.post("/sync", response_model=WorkoutsSyncResponse, status_code=status.HTTP_201_CREATED)
async def sync_workouts(
    payload: WorkoutsSyncRequest,
    auth: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> WorkoutsSyncResponse:
    promotions: list[StateUpdate] = []
    regressions: list[StateUpdate] = []
    synced_count = 0

    # Iterate in submitted order; spec says "process in chronological order".
    # The client is responsible for the order — we trust it and also sort by completed_at as a safety net.
    sorted_workouts = sorted(payload.workouts, key=lambda w: w.completed_at)

    for wk in sorted_workouts:
        # Idempotency: if a workout with this client_workout_id already exists for this user, skip
        existing = await session.execute(
            select(Workout.id).where(
                Workout.user_id == auth.user_id,
                Workout.client_workout_id == wk.client_workout_id,
            )
        )
        if existing.scalar_one_or_none() is not None:
            continue

        workout = Workout(
            user_id=auth.user_id,
            completed_at=wk.completed_at,
            client_workout_id=wk.client_workout_id,
        )
        session.add(workout)
        await session.flush()  # so workout.id is populated for set_logs

        # Build a quick lookup of node_id (UUID) -> ProgressionNode, Exercise
        node_ids: set[uuid.UUID] = set()
        for log in wk.logs:
            try:
                node_ids.add(uuid.UUID(log.node_id))
            except ValueError:
                continue

        if not node_ids:
            await session.flush()
            synced_count += 1
            continue

        node_rows = (
            await session.execute(
                select(ProgressionNode, Exercise, ProgressionNode.tree_id)
                .join(Exercise, Exercise.id == ProgressionNode.exercise_id)
                .where(ProgressionNode.id.in_(node_ids))
            )
        ).all()

        node_index: dict[uuid.UUID, tuple[ProgressionNode, Exercise, uuid.UUID]] = {
            row[0].id: (row[0], row[1], row[2]) for row in node_rows
        }

        # Track which nodes the user has sets on in this workout, for unlock checks at the end
        nodes_touched: set[uuid.UUID] = set()

        for log in wk.logs:
            try:
                parsed_node_id = uuid.UUID(log.node_id)
            except ValueError:
                continue
            entry = node_index.get(parsed_node_id)
            if entry is None:
                continue
            node, exercise, tree_uuid = entry

            # Insert set_logs
            for s in log.sets:
                session.add(
                    SetLog(
                        workout_id=workout.id,
                        node_id=parsed_node_id,
                        set_number=s.set_number,
                        reps=s.reps,
                        hold_secs=s.hold_secs,
                    )
                )

            # Per-set safety check (matches the doc's TypeScript runtime evaluator)
            regressed = False
            for s in log.sets:
                if exercise.movement_type == "isometric":
                    min_hold = node.min_fail_threshold_secs or 0
                    if (s.hold_secs or 0) < min_hold:
                        # Pick the highest-priority regression edge
                        reg_row = await session.execute(
                            select(ProgressionEdge)
                            .where(
                                ProgressionEdge.from_node_id == parsed_node_id,
                                ProgressionEdge.edge_type == "regression",
                            )
                            .order_by(ProgressionEdge.priority.asc().nulls_last())
                            .limit(1)
                        )
                        reg = reg_row.scalar_one_or_none()
                        if reg is not None:
                            # Update user_node_state to the regression target
                            await _set_current_node(session, auth.user_id, tree_uuid, reg.to_node_id)
                            regression_event = StateUpdate(
                                tree_id=to_tree_wire(tree_uuid),
                                old_node_id=to_node_wire(parsed_node_id),
                                new_node_id=to_node_wire(reg.to_node_id),
                                trigger="CRITICAL_FAIL",
                                reason=(
                                    f"Set {s.set_number} hold of {s.hold_secs or 0}s "
                                    f"fell below the critical fail threshold of {min_hold}s."
                                ),
                            )
                            regressions.append(regression_event)
                            # Persist as an unlock event for the social feed.
                            session.add(
                                UnlockEvent(
                                    user_id=auth.user_id,
                                    tree_id=tree_uuid,
                                    new_node_id=reg.to_node_id,
                                    trigger="CRITICAL_FAIL",
                                    note=regression_event.reason,
                                    occurred_at=wk.completed_at,
                                )
                            )
                            regressed = True
                            break
                else:  # isotonic
                    min_reps = node.min_fail_threshold_reps or 0
                    if (s.reps or 0) < min_reps:
                        reg_row = await session.execute(
                            select(ProgressionEdge)
                            .where(
                                ProgressionEdge.from_node_id == parsed_node_id,
                                ProgressionEdge.edge_type == "regression",
                            )
                            .order_by(ProgressionEdge.priority.asc().nulls_last())
                            .limit(1)
                        )
                        reg = reg_row.scalar_one_or_none()
                        if reg is not None:
                            await _set_current_node(session, auth.user_id, tree_uuid, reg.to_node_id)
                            regression_event = StateUpdate(
                                tree_id=to_tree_wire(tree_uuid),
                                old_node_id=to_node_wire(parsed_node_id),
                                new_node_id=to_node_wire(reg.to_node_id),
                                trigger="CRITICAL_FAIL",
                                reason=(
                                    f"Set {s.set_number} reps of {s.reps or 0} "
                                    f"fell below the critical fail threshold of {min_reps}."
                                ),
                            )
                            regressions.append(regression_event)
                            # Persist as an unlock event for the social feed.
                            session.add(
                                UnlockEvent(
                                    user_id=auth.user_id,
                                    tree_id=tree_uuid,
                                    new_node_id=reg.to_node_id,
                                    trigger="CRITICAL_FAIL",
                                    note=regression_event.reason,
                                    occurred_at=wk.completed_at,
                                )
                            )
                            regressed = True
                            break

            if not regressed:
                nodes_touched.add(parsed_node_id)

        # After processing the workout, run the PL/pgSQL promotion function
        # against every node the user did sets on and didn't regress from.
        for touched_uuid in nodes_touched:
            touched_node, _, tree_uuid = node_index[touched_uuid]
            # The PL/pgSQL function returns one row with: is_unlocked, next_node_id,
            # required_sets, completed_sets, metrics_summary
            result = await session.execute(
                text(
                    "SELECT is_unlocked, next_node_id, required_sets, completed_sets, "
                    "metrics_summary FROM check_node_unlock_status(:user_id, :node_id)"
                ),
                {"user_id": str(auth.user_id), "node_id": str(touched_uuid)},
            )
            row = result.first()
            if row is None:
                continue
            is_unlocked, next_node_id, _required, _completed, _metrics = row
            if is_unlocked and next_node_id is not None:
                await _set_current_node(session, auth.user_id, tree_uuid, next_node_id)
                promotion_event = StateUpdate(
                    tree_id=to_tree_wire(tree_uuid),
                    old_node_id=to_node_wire(touched_uuid),
                    new_node_id=to_node_wire(next_node_id),
                    trigger="PROMOTION",
                    reason="All target sets met on latest workout session.",
                )
                promotions.append(promotion_event)
                # Persist as an unlock event for the social feed.
                session.add(
                    UnlockEvent(
                        user_id=auth.user_id,
                        tree_id=tree_uuid,
                        new_node_id=next_node_id,
                        trigger="PROMOTION",
                        note=promotion_event.reason,
                        occurred_at=wk.completed_at,
                    )
                )

        synced_count += 1

    return WorkoutsSyncResponse(
        status="success",
        synced_workout_count=synced_count,
        state_updates=StateUpdates(promotions=promotions, regressions=regressions),
    )


async def _set_current_node(
    session: AsyncSession,
    user_id: uuid.UUID,
    tree_id: uuid.UUID,
    node_id: uuid.UUID,
) -> None:
    """Upsert user_node_state to point at (user, tree) -> node_id."""
    existing = await session.execute(
        select(UserNodeState).where(
            UserNodeState.user_id == user_id,
            UserNodeState.tree_id == tree_id,
        )
    )
    state = existing.scalar_one_or_none()
    if state is None:
        session.add(
            UserNodeState(
                user_id=user_id,
                tree_id=tree_id,
                current_node_id=node_id,
                unlocked_at=datetime.now(timezone.utc),
            )
        )
    else:
        state.current_node_id = node_id
        state.unlocked_at = datetime.now(timezone.utc)
    await session.flush()
