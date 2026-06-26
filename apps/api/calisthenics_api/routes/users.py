"""users router — PATCH + DELETE + export for the authed user.

PATCH  /api/v1/users/me             — update display_name
DELETE /api/v1/users/me             — wipe account (irreversible)
POST  /api/v1/users/me/export       — start an export job (returns 202 + job_id)

Per docs/decisions/D19-data-export-deletion.md — full plan is there.
These endpoints cover the user-facing actions; the actual export
dump job is a P5 follow-up (will need a background worker).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from calisthenics_api.auth import get_current_user
from calisthenics_api.db import get_session
from calisthenics_api.db.models import User
from calisthenics_api.schemas import AuthContext, UserPublic

router = APIRouter(prefix="/users", tags=["users"])


# -----------------------------------------------------------------------------#
# PATCH /api/v1/users/me — update display name
# -----------------------------------------------------------------------------#


class UpdateUserRequest(BaseModel):
    display_name: str | None = Field(default=None, max_length=64, min_length=1)


@router.patch("/me", response_model=UserPublic)
async def update_me(
    payload: UpdateUserRequest,
    auth: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> UserPublic:
    result = await session.execute(select(User).where(User.id == auth.user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    if payload.display_name is not None:
        # Trim and validate
        name = payload.display_name.strip()
        if not name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="display_name cannot be empty.",
            )
        user.display_name = name

    await session.flush()
    return UserPublic.model_validate(user)


# -----------------------------------------------------------------------------#
# DELETE /api/v1/users/me — wipe account
# -----------------------------------------------------------------------------#


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(
    auth: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    """Hard-delete the user and cascade-delete workouts, set_logs,
    user_node_state, tendon strain scores.

    Per D19: immediate, no grace period. If a soft-delete (tombstone +
    30-day purge) is needed later, swap this for an UPDATE setting
    deleted_at + a cron that purges tombstones older than 30 days.
    """
    result = await session.execute(select(User).where(User.id == auth.user_id))
    user = result.scalar_one_or_none()
    if user is None:
        # Already gone — treat as success
        return
    await session.delete(user)
    await session.flush()


# -----------------------------------------------------------------------------#
# POST /api/v1/users/me/export — sync JSON dump of the caller's data
# -----------------------------------------------------------------------------#
#
# Per docs/decisions/D19. The original spec called for an async
# arq job + email download link. For v1 we ship a synchronous JSON
# download — simpler, no worker, no email dependency. The
# `Content-Disposition: attachment` header triggers a browser
# download. The frontend (apps/web/src/lib/api.ts: requestExport)
# converts this to a save-as flow.
#
# Future migration to async export (when data volumes justify it):
# - Swap the JSONResponse for a 202 + job_id + email (D19 §data export)
# - The frontend already poll-checks for the response shape.


from fastapi.responses import JSONResponse

from calisthenics_api.db.models import (
    Friendship,
    SetLog,
    UnlockEvent,
    UserNodeState,
    Workout,
)


def _export_filename(email: str) -> str:
    """Build a deterministic per-user filename so repeat downloads
    don't collide. ISO date for sortability."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    safe = email.split("@", 1)[0].replace("/", "-") or "user"
    return f"calisthenics-tree-export-{safe}-{today}.json"


@router.post("/me/export")
async def export_me(
    auth: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> JSONResponse:
    """Dump everything we know about the caller as a single JSON object.

    Structure (top-level keys match the D19 spec section names):
      - profile       { email, display_name, created_at }
      - workouts      [{ completed_at, client_workout_id, sets: [...] }]
      - progressions  [{ tree_id, current_node_id, unlocked_at }]
      - unlocks       [{ tree_id, new_node_id, trigger, note, occurred_at }]
      - social        { following: [...], followers: [...] }
    """
    user = (
        await session.execute(select(User).where(User.id == auth.user_id))
    ).scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    # Workouts + sets (left join via relationship load)
    workouts_rows = (
        await session.execute(
            select(Workout, SetLog)
            .outerjoin(SetLog, SetLog.workout_id == Workout.id)
            .where(Workout.user_id == user.id)
            .order_by(Workout.completed_at.desc(), SetLog.set_number.asc())
        )
    ).all()

    # Group sets under their workout. Use a dict keyed by workout id so
    # we can build the nested structure in one pass.
    workouts_by_id: dict[uuid.UUID, dict] = {}
    for workout, set_log in workouts_rows:
        w = workouts_by_id.get(workout.id)
        if w is None:
            w = {
                "completed_at": workout.completed_at.isoformat(),
                "client_workout_id": workout.client_workout_id,
                "sets": [],
            }
            workouts_by_id[workout.id] = w
        if set_log is not None:
            w["sets"].append(
                {
                    "set_number": set_log.set_number,
                    "node_id": str(set_log.node_id),
                    "reps": set_log.reps,
                    "hold_secs": set_log.hold_secs,
                }
            )

    # Progression state (current node per tree)
    progressions_rows = (
        await session.execute(
            select(UserNodeState)
            .where(UserNodeState.user_id == user.id)
            .order_by(UserNodeState.unlocked_at.desc())
        )
    ).scalars().all()

    # Unlock events (feed data)
    unlocks_rows = (
        await session.execute(
            select(UnlockEvent)
            .where(UnlockEvent.user_id == user.id)
            .order_by(UnlockEvent.occurred_at.desc())
        )
    ).scalars().all()

    # Social graph — both directions of follow edges
    following_rows = (
        await session.execute(
            select(User, Friendship.created_at)
            .join(Friendship, Friendship.followee_id == User.id)
            .where(Friendship.follower_id == user.id)
            .order_by(Friendship.created_at.desc())
        )
    ).all()
    followers_rows = (
        await session.execute(
            select(User, Friendship.created_at)
            .join(Friendship, Friendship.follower_id == User.id)
            .where(Friendship.followee_id == user.id)
            .order_by(Friendship.created_at.desc())
        )
    ).all()

    payload = {
        "profile": {
            "email": user.email,
            "display_name": user.display_name,
            "created_at": user.created_at.isoformat(),
        },
        "workouts": list(workouts_by_id.values()),
        "progressions": [
            {
                "tree_id": str(p.tree_id),
                "current_node_id": str(p.current_node_id),
                "unlocked_at": p.unlocked_at.isoformat(),
            }
            for p in progressions_rows
        ],
        "unlocks": [
            {
                "tree_id": str(u.tree_id),
                "new_node_id": str(u.new_node_id),
                "trigger": u.trigger,
                "note": u.note,
                "occurred_at": u.occurred_at.isoformat(),
            }
            for u in unlocks_rows
        ],
        "social": {
            "following": [
                {
                    "user_id": str(u.id),
                    "email": u.email,
                    "display_name": u.display_name,
                    "followed_at": ts.isoformat(),
                }
                for u, ts in following_rows
            ],
            "followers": [
                {
                    "user_id": str(u.id),
                    "email": u.email,
                    "display_name": u.display_name,
                    "followed_at": ts.isoformat(),
                }
                for u, ts in followers_rows
            ],
        },
    }

    return JSONResponse(
        content=payload,
        headers={
            "Content-Disposition": f'attachment; filename="{_export_filename(user.email)}"',
            "Cache-Control": "no-store",
        },
    )