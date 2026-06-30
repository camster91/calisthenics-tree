"""Integration tests for the check_node_unlock_status PL/pgSQL function.

These require a running Postgres at DATABASE_URL or a local one started by
tests/scripts/spin_up_postgres.sh. Skipped if neither is available.

5 fixtures per the spec gate:
1. pass: user met the target on the latest workout
2. marginal pass: user met the target on most sets, min hold/reps above threshold
3. fail: user fell below threshold on at least one set
4. edge case at threshold: min hold/reps equals target_hold_secs/target_reps exactly
5. missing data: user has no workouts on this node
"""

from __future__ import annotations

import os
import uuid

import pytest
import pytest_asyncio

# Skip the entire module if no DATABASE_URL is set AND we can't spin one up
DATABASE_URL = os.environ.get("DATABASE_URL", "")
_HAS_DB = bool(DATABASE_URL)

pytestmark = pytest.mark.skipif(not _HAS_DB, reason="DATABASE_URL not set; no DB available for integration test")


@pytest_asyncio.fixture
async def db_session():
    """Yield a SQLAlchemy async session against the configured DB.

    Assumes migration 0001_initial has been applied.
    """
    if not DATABASE_URL:
        pytest.skip("DATABASE_URL not set")

    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    engine = create_async_engine(DATABASE_URL)
    factory = async_sessionmaker(bind=engine, expire_on_commit=False, class_=__import__("sqlalchemy.ext.asyncio", fromlist=["AsyncSession"]).AsyncSession)
    async with factory() as session:
        yield session
    await engine.dispose()


@pytest.mark.asyncio
async def test_5_fixtures(db_session):
    """Run all 5 fixtures against the seeded data and verify the function shape."""
    from sqlalchemy import select, text

    from calisthenics_api.db.models import (
        Exercise,
        ProgressionNode,
        ProgressionTree,
        SetLog,
        User,
        Workout,
    )

    # Pull a sample isometric node (Tuck Front Lever Hold, rank 6 in pull tree)
    stmt = (
        select(ProgressionNode, ProgressionTree, Exercise)
        .join(ProgressionTree, ProgressionTree.id == ProgressionNode.tree_id)
        .join(Exercise, Exercise.id == ProgressionNode.exercise_id)
        .where(ProgressionTree.slug == "pull_front_lever_path")
        .where(ProgressionNode.rank_level == 6)
    )
    row = (await db_session.execute(stmt)).first()
    assert row is not None, "Expected seeded Tuck FL node"
    node, tree, exercise = row
    assert exercise.movement_type == "isometric"
    assert node.target_hold_secs == 12
    assert node.min_fail_threshold_secs == 8
    assert node.target_sets == 3

    # Test user
    user = User(id=uuid.uuid4(), email=f"test+{uuid.uuid4()}@calisthenics.local")
    db_session.add(user)
    await db_session.flush()

    # --- Fixture 5: missing data (no workouts on this node) ---
    result = await db_session.execute(
        text("SELECT is_unlocked, next_node_id, required_sets, completed_sets, metrics_summary FROM check_node_unlock_status(:u, :n)"),
        {"u": str(user.id), "n": str(node.id)},
    )
    row = result.first()
    assert row is not None, "Function returned no row"
    is_unlocked, next_node_id, required_sets, completed_sets, metrics_summary = row
    assert is_unlocked is False
    assert next_node_id is None
    assert required_sets == 3
    assert completed_sets == 0
    assert metrics_summary["movement_type"] == "isometric"
    assert metrics_summary["target_hold_secs"] == 12

    # --- Fixture 1: pass (3 sets, all 15s hold) ---
    workout_pass = Workout(user_id=user.id, client_workout_id=f"pass-{uuid.uuid4()}")
    db_session.add(workout_pass)
    await db_session.flush()
    for i, secs in enumerate([15, 15, 15], start=1):
        db_session.add(SetLog(workout_id=workout_pass.id, node_id=node.id, set_number=i, hold_secs=secs))
    await db_session.flush()

    result = await db_session.execute(
        text("SELECT is_unlocked, next_node_id, required_sets, completed_sets, metrics_summary FROM check_node_unlock_status(:u, :n)"),
        {"u": str(user.id), "n": str(node.id)},
    )
    row = result.first()
    is_unlocked, next_node_id, required_sets, completed_sets, metrics_summary = row
    assert is_unlocked is True
    assert next_node_id is not None, "Expected a next_node_id on pass"
    assert required_sets == 3
    assert completed_sets == 3
    assert metrics_summary["min_hold_achieved"] == 15
    assert metrics_summary["target_hold_secs"] == 12

    # --- Fixture 4: edge case at threshold (3 sets, all exactly 12s) ---
    user2 = User(id=uuid.uuid4(), email=f"edge+{uuid.uuid4()}@calisthenics.local")
    db_session.add(user2)
    await db_session.flush()
    workout_edge = Workout(user_id=user2.id, client_workout_id=f"edge-{uuid.uuid4()}")
    db_session.add(workout_edge)
    await db_session.flush()
    for i in range(1, 4):
        db_session.add(SetLog(workout_id=workout_edge.id, node_id=node.id, set_number=i, hold_secs=12))
    await db_session.flush()

    result = await db_session.execute(
        text("SELECT is_unlocked FROM check_node_unlock_status(:u, :n)"),
        {"u": str(user2.id), "n": str(node.id)},
    )
    is_unlocked = result.scalar()
    # Spec: min_hold_achieved >= target_hold_secs; equality is a pass
    assert is_unlocked is True, "Edge case: hold exactly at target should be a pass"

    # --- Fixture 3: fail (3 sets, two above threshold but one below) ---
    user3 = User(id=uuid.uuid4(), email=f"fail+{uuid.uuid4()}@calisthenics.local")
    db_session.add(user3)
    await db_session.flush()
    workout_fail = Workout(user_id=user3.id, client_workout_id=f"fail-{uuid.uuid4()}")
    db_session.add(workout_fail)
    await db_session.flush()
    for i, secs in enumerate([15, 15, 5], start=1):  # 5s < 12s target
        db_session.add(SetLog(workout_id=workout_fail.id, node_id=node.id, set_number=i, hold_secs=secs))
    await db_session.flush()

    result = await db_session.execute(
        text("SELECT is_unlocked, metrics_summary FROM check_node_unlock_status(:u, :n)"),
        {"u": str(user3.id), "n": str(node.id)},
    )
    is_unlocked, metrics_summary = result.first()
    assert is_unlocked is False
    assert metrics_summary["min_hold_achieved"] == 5

    # --- Fixture 2: marginal pass (2 of 3 sets above target, 1 at target) ---
    user4 = User(id=uuid.uuid4(), email=f"marg+{uuid.uuid4()}@calisthenics.local")
    db_session.add(user4)
    await db_session.flush()
    workout_marg = Workout(user_id=user4.id, client_workout_id=f"marg-{uuid.uuid4()}")
    db_session.add(workout_marg)
    await db_session.flush()
    for i, secs in enumerate([15, 14, 12], start=1):  # all >= 12
        db_session.add(SetLog(workout_id=workout_marg.id, node_id=node.id, set_number=i, hold_secs=secs))
    await db_session.flush()

    result = await db_session.execute(
        text("SELECT is_unlocked, metrics_summary FROM check_node_unlock_status(:u, :n)"),
        {"u": str(user4.id), "n": str(node.id)},
    )
    is_unlocked, metrics_summary = result.first()
    assert is_unlocked is True, "Marginal pass: min at threshold should still be a pass"
    assert metrics_summary["min_hold_achieved"] == 12

    await db_session.commit()
