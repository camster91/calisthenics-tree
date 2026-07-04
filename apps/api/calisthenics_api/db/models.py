"""SQLAlchemy 2.0 ORM models for the calisthenics platform.

Schema matches the build plan in ~/.hermes/plans/calisthenics-platform-plan-2026-06-25.md
with the documented fix: progression_edges is a junction table that supports
multiple progressions / regressions / lateral moves per node (the source doc
used single pointers, which can't model a tuck FL regressing to advanced tuck
FL OR rings tuck FL OR weighted tuck FL).
"""

from __future__ import annotations

from enum import StrEnum

import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


# -----------------------------------------------------------------------------#
# Enums (Sprint 41 audit fix: code-quality O4 — was bare classes masquerading
# as enums. Now real StrEnum so mypy + IDEs catch typos. Column types in
# Postgres remain String + CHECK constraints — see migration 0001 for the
# CHECK clauses. These enums are the single source of truth for the literal
# values used in INSERTs.)
# -----------------------------------------------------------------------------#


class MovementType(StrEnum):
    ISOMETRIC = "isometric"
    ISOTONIC = "isotonic"


class EdgeType(StrEnum):
    PROGRESSION = "progression"  # harder variation
    REGRESSION = "regression"  # easier variation (recovery, on-the-fly swap)
    LATERAL = "lateral"  # parallel skill at the same rank_level (e.g., rings vs bar)


class JointPathway(StrEnum):
    """Body regions tracked for tendon strain."""

    STRAIGHT_ARM_ELBOW = "straight_arm_elbow"  # planche, front-lever elbow loading
    STRAIGHT_ARM_SHOULDER = "straight_arm_shoulder"  # planche, front-lever, handstand
    BENT_ARM_ELBOW = "bent_arm_elbow"  # pull-up, dip, push-up
    BENT_ARM_SHOULDER = "bent_arm_shoulder"  # pull-up, dip
    WRIST = "wrist"  # handstand loading
    CORE_LUMBAR = "core_lumbar"  # dragon flag, L-sit, hanging leg raise
    CORE_HIP_FLEXOR = "core_hip_flexor"  # L-sit, hanging leg raise


# -----------------------------------------------------------------------------#
# Tables
# -----------------------------------------------------------------------------#


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Soft-delete tombstone per D19 §deletion. NULL = active account.
    # Non-NULL = user requested deletion at this UTC time; daily purge
    # job hard-deletes once grace period (7d) elapses. Login during
    # the grace period restores by clearing this column.
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    workouts: Mapped[list[Workout]] = relationship(back_populates="user", cascade="all, delete-orphan")
    node_state: Mapped[list[UserNodeState]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    movement_type: Mapped[str] = mapped_column(String(50), nullable=False)
    primary_muscles: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False)
    secondary_muscles: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    video_url: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ProgressionTree(Base):
    __tablename__ = "progression_trees"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    nodes: Mapped[list[ProgressionNode]] = relationship(back_populates="tree", cascade="all, delete-orphan")


class ProgressionNode(Base):
    """A single skill node in a tree.

    Targets and fail thresholds are exactly as the source doc specifies.
    Edges (next / previous / regression / lateral) live in progression_edges
    so a node can have many of each kind.
    """

    __tablename__ = "progression_nodes"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    tree_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("progression_trees.id", ondelete="CASCADE"), nullable=False
    )
    exercise_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False
    )
    rank_level: Mapped[int] = mapped_column(Integer, nullable=False)
    target_sets: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    target_reps: Mapped[int | None] = mapped_column(Integer)
    target_hold_secs: Mapped[int | None] = mapped_column(Integer)
    min_fail_threshold_reps: Mapped[int | None] = mapped_column(Integer)
    min_fail_threshold_secs: Mapped[int | None] = mapped_column(Integer)
    # joint pathways this node loads (for tendon strain calculator)
    joint_pathways: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    # whether the node is a straight-arm isometric (1.8) or bent-arm (1.0)
    intensity_factor: Mapped[float] = mapped_column(default=1.0, nullable=False)

    tree: Mapped[ProgressionTree] = relationship(back_populates="nodes")
    exercise: Mapped[Exercise] = relationship()

    __table_args__ = (
        UniqueConstraint("tree_id", "exercise_id", name="uq_progression_nodes_tree_exercise"),
        Index("ix_progression_nodes_tree_rank", "tree_id", "rank_level"),
    )


class ProgressionEdge(Base):
    """Junction table: a node can have many progressions, regressions, or lateral moves.

    This is the deliberate fix vs the source doc, which used single
    progression_node_id / regression_node_id pointers and can't model
    'a tuck FL can regress to advanced tuck FL OR rings tuck FL OR weighted tuck FL'.
    """

    __tablename__ = "progression_edges"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    from_node_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("progression_nodes.id", ondelete="CASCADE"),
        nullable=False,
    )
    to_node_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("progression_nodes.id", ondelete="CASCADE"),
        nullable=False,
    )
    edge_type: Mapped[str] = mapped_column(String(20), nullable=False)
    # Priority for on-the-fly regression picking (lower = preferred). NULL = unranked.
    priority: Mapped[int | None] = mapped_column(Integer)

    __table_args__ = (
        # A given (from, to, edge_type) triple is unique
        UniqueConstraint("from_node_id", "to_node_id", "edge_type", name="uq_progression_edges_triple"),
        Index("ix_progression_edges_from", "from_node_id", "edge_type"),
    )


class Workout(Base):
    __tablename__ = "workouts"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    # client_workout_id from offline sync for idempotency
    client_workout_id: Mapped[str | None] = mapped_column(String(255), index=True)

    user: Mapped[User] = relationship(back_populates="workouts")
    set_logs: Mapped[list[SetLog]] = relationship(back_populates="workout", cascade="all, delete-orphan")

    __table_args__ = (Index("ix_workouts_user_completed", "user_id", "completed_at"),)


class SetLog(Base):
    __tablename__ = "set_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    workout_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("workouts.id", ondelete="CASCADE"), nullable=False
    )
    node_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("progression_nodes.id", ondelete="CASCADE"), nullable=False
    )
    set_number: Mapped[int] = mapped_column(Integer, nullable=False)
    reps: Mapped[int | None] = mapped_column(Integer)
    hold_secs: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    workout: Mapped[Workout] = relationship(back_populates="set_logs")

    __table_args__ = (Index("ix_set_logs_workout_node", "workout_id", "node_id"),)


class Friendship(Base):
    """A directed follow edge between two users.

    Following is one-way (A → B) but we store both directions implicitly:
    listing 'who I follow' queries where follower_id = me; listing
    'who follows me' queries where followee_id = me. v1 has no mutual /
    accepted friendship concept — follow is instant.
    """

    __tablename__ = "friendships"

    follower_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    followee_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint("follower_id <> followee_id", name="ck_friendships_not_self"),
        # Sprint 40: covering index for /api/v1/friends. The composite
        # PK (follower_id, followee_id) handles uniqueness + prefix
        # lookups but doesn't preserve created_at order — Postgres had
        # to sort in-memory. This index lets the bounded list query
        # (ORDER BY created_at DESC LIMIT N) become an Index Scan
        # Backward with no Sort node. Migration: 0009.
        Index("ix_friendships_follower_time", "follower_id", "created_at"),
    )


class UserNodeState(Base):
    """Where the user currently is in each tree."""

    __tablename__ = "user_node_state"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    tree_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("progression_trees.id", ondelete="CASCADE"),
        nullable=False,
    )
    current_node_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("progression_nodes.id", ondelete="CASCADE"),
        nullable=False,
    )
    unlocked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped[User] = relationship(back_populates="node_state")

    __table_args__ = (
        # A user has at most one current node per tree
        UniqueConstraint("user_id", "tree_id", name="uq_user_node_state_user_tree"),
    )


class TendonStrainScore(Base):
    """Per-user, per-pathway weekly strain score, fed by the tendon calculator."""

    __tablename__ = "tendon_strain_scores"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    joint_pathway: Mapped[str] = mapped_column(String(50), nullable=False)
    score: Mapped[float] = mapped_column(nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (Index("ix_tendon_user_pathway_time", "user_id", "joint_pathway", "recorded_at"),)


class UnlockEvent(Base):
    """A promotion or regression on a single tree — the unit the social
    feed is built from.

    Written when /api/v1/workouts/sync returns state_updates.promotions /
    .regressions. One row per StateUpdate so the feed can list every
    milestone separately.
    """

    __tablename__ = "unlock_events"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    tree_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("progression_trees.id", ondelete="CASCADE"),
        nullable=False,
    )
    new_node_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("progression_nodes.id", ondelete="CASCADE"),
        nullable=False,
    )
    trigger: Mapped[str] = mapped_column(String(20), nullable=False)
    """ One of: 'CRITICAL_FAIL' | 'PROMOTION' | 'ON_SYNC' — matches the
    workout-sync wire enum. """
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_unlock_events_user_time", "user_id", "occurred_at"),
    )


class MagicLinkConsumed(Base):
    """Sprint 38 hardening RED-6 — magic-link replay protection.

    Every successful /auth/verify inserts the SHA-256 of the magic-link
    token here inside the same transaction. Subsequent verify calls with
    the same token find a row and 400 out as 'token already used'. Closes
    the 15-min replay window that previously let an intercepted magic-link
    email mint arbitrary JWT pairs.

    Schema:
        token_hash  PK — SHA-256 hex of the token (never the raw token).
        consumed_at — when the verify call succeeded.
        user_id     — FK to the user who consumed it.

    Storage: tiny. One row per successful verify. No TTL needed.
    """

    __tablename__ = "magic_link_consumed"

    token_hash: Mapped[str] = mapped_column(String(128), primary_key=True)
    consumed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    __table_args__ = (
        Index("ix_magic_link_consumed_user_time", "user_id", "consumed_at"),
    )


__all__ = [
    "Base",
    "EdgeType",
    "Exercise",
    "Friendship",
    "JointPathway",
    "MagicLinkConsumed",
    "MovementType",
    "ProgressionEdge",
    "ProgressionNode",
    "ProgressionTree",
    "SetLog",
    "TendonStrainScore",
    "UnlockEvent",
    "User",
    "UserNodeState",
    "Workout",
]
