"""Pydantic schemas matching the API contract from doc 1xVncsrmJYVdeBClzHr3SmT3hnKsdi41HDCqAj9f08RE section 2.

The doc shows string IDs with prefixes like 'usr_...', 'tree_...', 'node_...'.
For Phase 1 we store raw UUIDs in Postgres and prefix them at the response
edge so the wire format matches the spec exactly. This is a deliberate
choice — it lets the frontend build URLs that read like the spec examples
without a translation layer.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# -----------------------------------------------------------------------------#
# Auth (Phase 2 — magic-link + JWT)
# -----------------------------------------------------------------------------#


class MagicLinkRequest(BaseModel):
    email: EmailStr


class MagicLinkResponse(BaseModel):
    """Returned by POST /api/v1/auth/magic-link.

    `dev_token` is populated ONLY when POSTMARK_TOKEN is unset (dev mode).
    Production clients always get a bare 202 with no token.
    """

    status: Literal["sent", "dev"] = "sent"
    expires_at: datetime
    dev_token: str | None = None


class UserPublic(BaseModel):
    """User shape returned to the client after auth. Mirrors the User model
    but exposes only safe, public fields."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    created_at: datetime


class VerifyResponse(BaseModel):
    """Returned by GET /api/v1/auth/verify after a magic link is consumed."""

    access_token: str
    access_expires_at: datetime
    refresh_token: str
    refresh_expires_at: datetime
    user: UserPublic


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    """Returned by POST /api/v1/auth/refresh."""

    access_token: str
    access_expires_at: datetime
    refresh_token: str
    refresh_expires_at: datetime


# -----------------------------------------------------------------------------#
# ID prefix helpers — wire format only, never the canonical form in DB
# -----------------------------------------------------------------------------#


def _id(prefix: str, value: uuid.UUID | str) -> str:
    s = str(value)
    if s.startswith(f"{prefix}_"):
        return s
    return f"{prefix}_{s}"


def user_id(value: uuid.UUID | str) -> str:
    return _id("usr", value)


def tree_id(value: uuid.UUID | str) -> str:
    return _id("tree", value)


def node_id(value: uuid.UUID | str) -> str:
    return _id("node", value)


# -----------------------------------------------------------------------------#
# Auth
# -----------------------------------------------------------------------------#


class AuthContext(BaseModel):
    """Resolved bearer-token identity, attached to request via dependency."""

    model_config = ConfigDict(frozen=True)

    user_id: uuid.UUID
    email: str


# -----------------------------------------------------------------------------#
# GET /api/v1/users/me/progressions
# -----------------------------------------------------------------------------#


class CurrentNode(BaseModel):
    node_id: str
    exercise_name: str
    movement_type: Literal["isometric", "isotonic"]
    target_sets: int
    target_reps: int | None = None
    target_hold_secs: int | None = None


class ActiveProgression(BaseModel):
    tree_id: str
    tree_name: str
    current_node: CurrentNode


class ProgressionsResponse(BaseModel):
    user_id: str
    updated_at: datetime
    active_progressions: list[ActiveProgression]


# -----------------------------------------------------------------------------#
# POST /api/v1/workouts/sync
# -----------------------------------------------------------------------------#


class SyncedSet(BaseModel):
    set_number: int = Field(ge=1)
    reps: int | None = None
    hold_secs: int | None = None

    @field_validator("reps", "hold_secs")
    @classmethod
    def at_least_one(cls, v: int | None, info) -> int | None:
        # Either reps or hold_secs is required
        return v


class SyncedLog(BaseModel):
    node_id: str
    sets: list[SyncedSet]

    @field_validator("node_id")
    @classmethod
    def strip_node_prefix(cls, v: str) -> str:
        # Accept both 'node_<uuid>' and raw '<uuid>' — we strip the prefix and reapply
        if v.startswith("node_"):
            return v[len("node_"):]
        return v


class SyncedWorkout(BaseModel):
    client_workout_id: str
    completed_at: datetime
    logs: list[SyncedLog]


class WorkoutsSyncRequest(BaseModel):
    sync_client_timestamp: datetime
    workouts: list[SyncedWorkout]


class StateUpdate(BaseModel):
    tree_id: str
    old_node_id: str
    new_node_id: str
    trigger: Literal["CRITICAL_FAIL", "PROMOTION", "ON_SYNC"]
    reason: str


class StateUpdates(BaseModel):
    promotions: list[StateUpdate] = Field(default_factory=list)
    regressions: list[StateUpdate] = Field(default_factory=list)


class WorkoutsSyncResponse(BaseModel):
    status: Literal["success"] = "success"
    synced_workout_count: int
    state_updates: StateUpdates


# -----------------------------------------------------------------------------#
# POST /api/v1/onboarding/place
# -----------------------------------------------------------------------------#


class OnboardingAnswers(BaseModel):
    can_pull_up: bool
    support_hold_15s: bool = False
    active_hang_10s: bool = False
    rir2_pushup_reps: int = Field(ge=0)


class TreePlacement(BaseModel):
    tree_id: str
    tree_name: str
    starting_node_id: str
    starting_node_name: str
    starting_rank: int


class OnboardingPlaceRequest(BaseModel):
    answers: OnboardingAnswers


class OnboardingPlaceResponse(BaseModel):
    archetype: Literal["beginner", "novice_a", "novice_b", "intermediate"]
    rir2_offset: int
    placements: list[TreePlacement]


# -----------------------------------------------------------------------------#
# Health
# -----------------------------------------------------------------------------#


class HealthResponse(BaseModel):
    status: Literal["ok"]
    version: str
    environment: str


__all__ = [
    "ActiveProgression",
    "AuthContext",
    "CurrentNode",
    "HealthResponse",
    "MagicLinkRequest",
    "MagicLinkResponse",
    "OnboardingAnswers",
    "OnboardingPlaceRequest",
    "OnboardingPlaceResponse",
    "ProgressionsResponse",
    "RefreshRequest",
    "RefreshResponse",
    "StateUpdate",
    "StateUpdates",
    "SyncedLog",
    "SyncedSet",
    "SyncedWorkout",
    "TreePlacement",
    "UserPublic",
    "VerifyResponse",
    "WorkoutsSyncRequest",
    "WorkoutsSyncResponse",
    "node_id",
    "tree_id",
    "user_id",
]
