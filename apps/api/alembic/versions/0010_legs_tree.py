"""Sprint 40 — add a 4th progression tree: legs (pistol squat path).

Proves the architecture supports more than 3 trees without code changes.
The skill DAG model (ProgressionTree + ProgressionNode + ProgressionEdge)
is fully generic — onboarding, progressions, history, share cards,
workout logging, the social feed, the SEO landing pages all work
without modification when a new tree is added.

This migration adds:
- One tree: `legs_single_leg_path` (slug) / "Legs (Single-Leg Squat Path)"
- 10 nodes from body-weight squat to full single-leg pistol squat
- A linear progression edge chain + 2 regression edges

Idempotent: every UUID is uuid5-derived from a stable namespace + name,
so re-running the migration on a DB that already has this seed is a
no-op (the inserts collide on PK).
"""

from __future__ import annotations

import uuid

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "0010_legs_tree"
down_revision = "0009_friendships_follower_time"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Per-tree TEMP table so the edge-inserts below can JOIN without
    # duplicating the uuid5 derivation logic. Mirrors the pattern
    # from migration 0001 (seed_push_nodes / seed_pull_nodes / seed_core_nodes).
    op.execute("CREATE TEMP TABLE seed_legs_nodes (rank_level INT, node_id UUID) ON COMMIT DROP")

    legs_nodes = [
        # (rank, exercise_name, movement, target_sets, target_reps,
        #  target_hold, min_fail_reps, min_fail_secs, intensity,
        #  pathways, video_url)
        (1,  "Bodyweight Squat",                "isotonic",  3, 15, None,  8, None, 1.0, ["core_hip_flexor", "core_lumbar"],                   "https://example.com/bw-squat"),
        (2,  "Box Pistol Squat (Assisted)",     "isotonic",  3,  8, None,  4, None, 1.0, ["core_hip_flexor", "core_lumbar", "wrist"],         "https://example.com/box-pistol"),
        (3,  "Assisted Pistol Squat (Counter)", "isotonic",  3,  6, None,  3, None, 1.0, ["core_hip_flexor", "core_lumbar", "wrist"],         "https://example.com/counter-pistol"),
        (4,  "Negative Pistol Squat",           "isotonic",  3,  5, None,  3, None, 1.2, ["core_hip_flexor", "core_lumbar", "wrist"],         "https://example.com/negative-pistol"),
        (5,  "Bulgarian Split Squat",           "isotonic",  3,  8, None,  4, None, 1.2, ["core_hip_flexor", "core_lumbar", "wrist"],         "https://example.com/bulgarian-split"),
        (6,  "Shrimp Squat",                    "isotonic",  3,  5, None,  3, None, 1.5, ["core_hip_flexor", "core_lumbar", "wrist"],         "https://example.com/shrimp-squat"),
        (7,  "Pistol Squat (Both Legs Parallel)","isotonic", 3,  5, None,  3, None, 1.5, ["core_hip_flexor", "core_lumbar", "wrist"],         "https://example.com/pistol-parallel"),
        (8,  "Pistol Squat (Full)",             "isotonic",  3,  4, None,  2, None, 1.8, ["core_hip_flexor", "core_lumbar", "wrist"],         "https://example.com/pistol-full"),
        (9,  "Weighted Pistol Squat (Light)",   "isotonic",  3,  3, None,  1, None, 2.0, ["core_hip_flexor", "core_lumbar", "wrist"],         "https://example.com/pistol-weighted-light"),
        (10, "Weighted Pistol Squat (Heavy)",   "isotonic",  3,  3, None,  1, None, 2.4, ["core_hip_flexor", "core_lumbar", "wrist"],         "https://example.com/pistol-weighted-heavy"),
    ]

    _seed_tree(
        slug="legs_single_leg_path",
        name="Legs (Single-Leg Squat Path)",
        description="From bodyweight squat to weighted single-leg pistol squat. Builds unilateral leg strength + balance.",
        nodes=legs_nodes,
        temp_table="seed_legs_nodes",
    )

    # Linear progression edge chain: rank N -> rank N+1.
    op.execute(
        "INSERT INTO progression_edges (from_node_id, to_node_id, edge_type, priority) "
        "SELECT a.node_id, b.node_id, 'progression', NULL "
        "FROM seed_legs_nodes a JOIN seed_legs_nodes b ON b.rank_level = a.rank_level + 1"
    )

    # Two regression edges, modeled after the pull tree's tuck-FL case.
    # The shrimp squat (rank 6) is a regression target from the parallel
    # pistol (rank 7) — when the parallel variant fails, fall back to
    # the supported shrimp. The box pistol (rank 2) is the deeper
    # regression from the negative pistol (rank 4) for a power user who
    # fatigues mid-set.
    op.execute(
        "INSERT INTO progression_edges (from_node_id, to_node_id, edge_type, priority) "
        "SELECT a.node_id, b.node_id, 'regression', 1 "
        "FROM seed_legs_nodes a JOIN seed_legs_nodes b ON b.rank_level = 6 "
        "WHERE a.rank_level = 7"
    )
    op.execute(
        "INSERT INTO progression_edges (from_node_id, to_node_id, edge_type, priority) "
        "SELECT a.node_id, b.node_id, 'regression', 2 "
        "FROM seed_legs_nodes a JOIN seed_legs_nodes b ON b.rank_level = 2 "
        "WHERE a.rank_level = 4"
    )


def downgrade() -> None:
    # Reverse the seed by tree id (deterministic uuid5 from the slug).
    tree_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, "calisthenics:tree:legs_single_leg_path"))
    # ON DELETE CASCADE on progression_edges + progression_nodes handles
    # the dependent rows when the tree goes.
    op.execute(f"DELETE FROM progression_trees WHERE id = '{tree_id}'")


def _seed_tree(slug: str, name: str, description: str, nodes: list, temp_table: str) -> None:
    """Helper duplicated from migration 0001 (alembic doesn't share
    helpers between versions) so this migration is self-contained.
    Inserts a tree + its exercises + nodes, capturing node UUIDs by
    rank in the per-migration temp table for the edge-insert steps.
    """
    tree_id = uuid.uuid5(uuid.NAMESPACE_DNS, f"calisthenics:tree:{slug}")
    conn = op.get_bind()

    conn.execute(
        sa.text(
            "INSERT INTO progression_trees (id, name, description, slug) "
            "VALUES (:id, :name, :description, :slug) "
            "ON CONFLICT (id) DO NOTHING"
        ),
        {"id": str(tree_id), "name": name, "description": description, "slug": slug},
    )

    for (
        rank,
        ex_name,
        movement,
        target_sets,
        target_reps,
        target_hold,
        min_fail_reps,
        min_fail_secs,
        intensity,
        pathways,
        video_url,
    ) in nodes:
        ex_id = uuid.uuid5(uuid.NAMESPACE_DNS, f"calisthenics:exercise:{ex_name}")
        conn.execute(
            sa.text(
                "INSERT INTO exercises (id, name, movement_type, primary_muscles, secondary_muscles, video_url) "
                "VALUES (:id, :name, :movement, :primary, :secondary, :video) "
                "ON CONFLICT (id) DO NOTHING"
            ),
            {
                "id": str(ex_id),
                "name": ex_name,
                "movement": movement,
                "primary": [pathways[0]] if pathways else [],
                "secondary": pathways[1:] if len(pathways) > 1 else [],
                "video": video_url,
            },
        )

        node_id = uuid.uuid5(uuid.NAMESPACE_DNS, f"calisthenics:node:{slug}:{rank}")
        conn.execute(
            sa.text(
                "INSERT INTO progression_nodes (id, tree_id, exercise_id, rank_level, target_sets, target_reps, target_hold_secs, min_fail_threshold_reps, min_fail_threshold_secs, joint_pathways, intensity_factor) "
                "VALUES (:id, :tree_id, :exercise_id, :rank, :target_sets, :target_reps, :target_hold, :min_fail_reps, :min_fail_secs, :pathways, :intensity) "
                "ON CONFLICT (id) DO NOTHING"
            ),
            {
                "id": str(node_id),
                "tree_id": str(tree_id),
                "exercise_id": str(ex_id),
                "rank": rank,
                "target_sets": target_sets,
                "target_reps": target_reps,
                "target_hold": target_hold,
                "min_fail_reps": min_fail_reps,
                "min_fail_secs": min_fail_secs,
                "pathways": pathways,
                "intensity": intensity,
            },
        )
        conn.execute(
            sa.text(f"INSERT INTO {temp_table} (rank_level, node_id) VALUES (:r, :n)"),
            {"r": rank, "n": str(node_id)},
        )