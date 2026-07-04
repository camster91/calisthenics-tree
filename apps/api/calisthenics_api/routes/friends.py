"""Friends + public profile endpoints (Phase 4 social).

POST   /api/v1/friends          — follow a user by email or user_id
DELETE /api/v1/friends/{user_id} — unfollow
GET    /api/v1/friends          — list who I follow
GET    /api/v1/users/{user_id}  — public profile (display_name, current_node per tree)
GET    /api/v1/users/{user_id}/unlocks — recent unlock events for that user
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from calisthenics_api.auth import get_current_user
from calisthenics_api.db import get_session
from calisthenics_api.db.models import (
    Exercise,
    Friendship,
    ProgressionNode,
    ProgressionTree,
    UnlockEvent,
    User,
    UserNodeState,
)
from calisthenics_api.schemas import AuthContext

router = APIRouter(tags=["friends"])

# Sprint 41 audit fix (security MED-5): bound the {user_id} path param to
# a canonical UUID shape. Other routers (nodes, trees) use the same
# pattern for their wire-format ids. Without this, a 100KB garbage string
# on `DELETE /api/v1/friends/{user_id}` is a cheap DoS — the SQL query
# never runs but the string is parsed, the route matches, and the request
# is logged at length. 36 chars + hyphens is the canonical UUID4 format.
_USER_ID_PATH_PATTERN = (
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)


# -----------------------------------------------------------------------------#
# POST /api/v1/friends
# -----------------------------------------------------------------------------#


class FollowRequest(BaseModel):
    """Resolve target by EITHER email or user_id (wire-format)."""

    email: str | None = None
    user_id: str | None = None


class FollowResponse(BaseModel):
    status: str = "followed"
    followee_id: str


async def _is_following(
    session: AsyncSession,
    *,
    follower_id: uuid.UUID,
    followee_id: uuid.UUID,
) -> bool:
    """Sprint 38 helper — single-direction follow check used by both
    follow_user and get_public_profile (PII gating). Returns True iff
    `follower_id` follows `followee_id`."""
    if follower_id == followee_id:
        return True  # self-follow counts for the PII gate
    # Friendship has composite PK (follower_id, followee_id) — no
    # standalone .id column. Select either key of the PK; the test
    # is whether any row matches, not what column we project.
    result = await session.execute(
        select(Friendship.follower_id).where(
            Friendship.follower_id == follower_id,
            Friendship.followee_id == followee_id,
        )
    )
    return result.scalar_one_or_none() is not None


@router.post("/friends", response_model=FollowResponse, status_code=status.HTTP_201_CREATED)
async def follow_user(
    payload: FollowRequest,
    auth: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> FollowResponse:
    if payload.email is None and payload.user_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide email or user_id.",
        )

    target: User | None = None
    if payload.user_id is not None:
        # Accept both raw UUID and wire-format usr_<uuid>
        raw = payload.user_id.removeprefix("usr_")
        try:
            target_uuid = uuid.UUID(raw)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user_id.",
            ) from exc
        target = (
            await session.execute(select(User).where(User.id == target_uuid))
        ).scalar_one_or_none()
    else:
        target = (
            await session.execute(
                select(User).where(User.email == payload.email.lower())
            )
        ).scalar_one_or_none()

    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    if target.id == auth.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot follow yourself.",
        )

    # Idempotent: if already following, return success without insert.
    existing = (
        await session.execute(
            select(Friendship).where(
                Friendship.follower_id == auth.user_id,
                Friendship.followee_id == target.id,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        return FollowResponse(followee_id=f"usr_{target.id}")

    session.add(
        Friendship(follower_id=auth.user_id, followee_id=target.id)
    )
    try:
        await session.flush()
    except IntegrityError as exc:
        # Race condition with the CHECK constraint or duplicate (follower_id, followee_id)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already following this user.",
        ) from exc

    return FollowResponse(followee_id=f"usr_{target.id}")


# -----------------------------------------------------------------------------#
# DELETE /api/v1/friends/{user_id}
# -----------------------------------------------------------------------------#


@router.delete("/friends/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unfollow_user(
    user_id: str = Path(..., pattern=_USER_ID_PATH_PATTERN),
    auth: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    raw = user_id.removeprefix("usr_")
    try:
        target_uuid = uuid.UUID(raw)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user_id.",
        ) from exc
    existing = (
        await session.execute(
            select(Friendship).where(
                Friendship.follower_id == auth.user_id,
                Friendship.followee_id == target_uuid,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        await session.delete(existing)
        await session.flush()


# -----------------------------------------------------------------------------#
# GET /api/v1/friends
# -----------------------------------------------------------------------------#


class FriendSummary(BaseModel):
    user_id: str
    email: str
    display_name: str | None
    followed_at: str


@router.get("/friends", response_model=None)
async def list_friends(
    # Sprint 39 YELLOW: bound the list. Was unbounded — a power user
    # following thousands of people would get a massive payload every
    # call. Default 50, max 200 (matches /me/history).
    limit: int = Query(default=50, ge=1, le=200),
    auth: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Who I follow, newest follow first."""
    rows = (
        await session.execute(
            select(Friendship, User)
            .join(User, User.id == Friendship.followee_id)
            .where(Friendship.follower_id == auth.user_id)
            .order_by(Friendship.created_at.desc())
            .limit(limit)
        )
    ).all()
    items = [
        FriendSummary(
            user_id=f"usr_{u.id}",
            email=u.email,
            display_name=u.display_name,
            followed_at=f.created_at.isoformat(),
        )
        for f, u in rows
    ]
    return {"items": [i.model_dump() for i in items]}


# -----------------------------------------------------------------------------#
# GET /api/v1/users/{user_id} — public profile
# -----------------------------------------------------------------------------#


class PublicProfile(BaseModel):
    user_id: str
    # Sprint 38 YELLOW PII gating — email is no longer always exposed.
    # Only included when caller follows target OR is target. Otherwise null.
    email: str | None
    display_name: str | None
    current_nodes: list[dict]  # [{tree_id, tree_name, node_id, node_name}]
    is_following: bool  # true if caller follows target (for UX clarity)


@router.get("/users/{user_id}", response_model=None)
async def get_public_profile(
    user_id: str = Path(..., pattern=_USER_ID_PATH_PATTERN),
    auth: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Public profile — display name + current node per tree.

    Sprint 38 YELLOW PII gating: email is no longer leaked to arbitrary
    callers. Visible only when caller is target (self-view), follows
    target, or target follows caller (mutual). For everyone else, email
    is null — UI shows 'User' or display_name.

    v1 follow-by-email flow (`POST /api/v1/friends`) still requires the
    follower's identity to know who they are; that's authed, not a leak.
    """
    raw = user_id.removeprefix("usr_")
    try:
        target_uuid = uuid.UUID(raw)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user_id.",
        ) from exc

    user = (
        await session.execute(select(User).where(User.id == target_uuid))
    ).scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    # PII gate — show email only to: self, follower-of-target, or target-of-caller.
    is_self = auth.user_id == user.id
    is_following = False
    is_followed_by = False
    if not is_self:
        is_following = await _is_following(
            session, follower_id=auth.user_id, followee_id=user.id
        )
        is_followed_by = await _is_following(
            session, follower_id=user.id, followee_id=auth.user_id
        )
    can_see_email = is_self or is_following or is_followed_by

    state_rows = (
        await session.execute(
            select(UserNodeState, ProgressionNode, ProgressionTree, Exercise)
            .join(ProgressionNode, ProgressionNode.id == UserNodeState.current_node_id)
            .join(ProgressionTree, ProgressionTree.id == UserNodeState.tree_id)
            .join(Exercise, Exercise.id == ProgressionNode.exercise_id)
            .where(UserNodeState.user_id == user.id)
        )
    ).all()

    current_nodes = [
        {
            "tree_id": f"tree_{tree.id}",
            "tree_name": tree.name,
            "node_id": f"node_{node.id}",
            "node_name": exercise.name,
        }
        for _state, node, tree, exercise in state_rows
    ]

    return {
        "user_id": f"usr_{user.id}",
        "email": user.email if can_see_email else None,
        "display_name": user.display_name,
        "current_nodes": current_nodes,
        "is_following": is_following,
    }


# -----------------------------------------------------------------------------#
# GET /api/v1/users/{user_id}/unlocks — their recent unlock events
# -----------------------------------------------------------------------------#


@router.get("/users/{user_id}/unlocks", response_model=None)
async def get_user_unlocks(
    user_id: str = Path(..., pattern=_USER_ID_PATH_PATTERN),
    # Sprint 39 P1: bound the unlock limit. Was `int = 20` (no upper
    # bound) — a caller could pass ?limit=10000 and DOS the api or pull
    # an entire user's history. Mirror the /feed cap.
    limit: int = Query(default=20, ge=1, le=100),
    _auth: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    raw = user_id.removeprefix("usr_")
    try:
        target_uuid = uuid.UUID(raw)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user_id.",
        ) from exc

    rows = (
        await session.execute(
            select(UnlockEvent, ProgressionTree, ProgressionNode, Exercise)
            .join(ProgressionTree, ProgressionTree.id == UnlockEvent.tree_id)
            .join(ProgressionNode, ProgressionNode.id == UnlockEvent.new_node_id)
            .join(Exercise, Exercise.id == ProgressionNode.exercise_id)
            .where(UnlockEvent.user_id == target_uuid)
            .order_by(UnlockEvent.occurred_at.desc())
            .limit(limit)
        )
    ).all()

    items = [
        {
            "id": f"unlock_{ev.id}",
            "user": {
                "id": f"usr_{target_uuid}",
                "email": "",  # Filled in by caller if they want it
            },
            "tree_id": f"tree_{tree.id}",
            "tree_name": tree.name,
            "new_node_id": f"node_{node.id}",
            "new_node_name": exercise.name,
            "trigger": ev.trigger,
            "note": ev.note,
            "occurred_at": ev.occurred_at.isoformat(),
        }
        for ev, tree, node, exercise in rows
    ]
    return {"items": items}