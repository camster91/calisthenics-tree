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
# POST /api/v1/users/me/export — kick off an export job
# -----------------------------------------------------------------------------#


class ExportJobResponse(BaseModel):
    status: str = "queued"
    job_id: uuid.UUID
    requested_at: datetime


@router.post(
    "/me/export",
    response_model=ExportJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def export_me(
    auth: AuthContext = Depends(get_current_user),
) -> ExportJobResponse:
    """Stub: queue an export job, return job_id.

    Full implementation lands in P5 alongside the background-job
    runner (arq, per docs/decisions/D9-background-jobs.md). For now the
    caller gets a job_id they can poll; the job does nothing yet.
    """
    return ExportJobResponse(
        job_id=uuid.uuid4(),
        requested_at=datetime.now(timezone.utc),
    )