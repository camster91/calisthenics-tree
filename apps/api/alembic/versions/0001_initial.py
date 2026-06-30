"""Initial schema: full DAG model + tendon strain table + PL/pgSQL promotion function + seed 3 trees.

Revision ID: 0001_initial
Revises:
Create Date: 2026-06-25
"""

from __future__ import annotations

import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ARRAY, UUID

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---------------------------------------------------------------------#
    # Schema
    # ---------------------------------------------------------------------#
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "exercises",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("movement_type", sa.String(50), nullable=False),
        sa.Column("primary_muscles", ARRAY(sa.Text), nullable=False),
        sa.Column("secondary_muscles", ARRAY(sa.Text), server_default=sa.text("'{}'::text[]")),
        sa.Column("video_url", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "movement_type IN ('isometric', 'isotonic')", name="ck_exercises_movement_type"
        ),
    )

    op.create_table(
        "progression_trees",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("slug", sa.String(100), unique=True, nullable=False),
    )

    op.create_table(
        "progression_nodes",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "tree_id",
            UUID(as_uuid=True),
            sa.ForeignKey("progression_trees.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "exercise_id",
            UUID(as_uuid=True),
            sa.ForeignKey("exercises.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("rank_level", sa.Integer, nullable=False),
        sa.Column("target_sets", sa.Integer, nullable=False, server_default=sa.text("3")),
        sa.Column("target_reps", sa.Integer, nullable=True),
        sa.Column("target_hold_secs", sa.Integer, nullable=True),
        sa.Column("min_fail_threshold_reps", sa.Integer, nullable=True),
        sa.Column("min_fail_threshold_secs", sa.Integer, nullable=True),
        sa.Column("joint_pathways", ARRAY(sa.Text), server_default=sa.text("'{}'::text[]"), nullable=False),
        sa.Column("intensity_factor", sa.Float, nullable=False, server_default=sa.text("1.0")),
        sa.UniqueConstraint("tree_id", "exercise_id", name="uq_progression_nodes_tree_exercise"),
    )
    op.create_index("ix_progression_nodes_tree_rank", "progression_nodes", ["tree_id", "rank_level"])

    op.create_table(
        "progression_edges",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "from_node_id",
            UUID(as_uuid=True),
            sa.ForeignKey("progression_nodes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "to_node_id",
            UUID(as_uuid=True),
            sa.ForeignKey("progression_nodes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("edge_type", sa.String(20), nullable=False),
        sa.Column("priority", sa.Integer, nullable=True),
        sa.UniqueConstraint("from_node_id", "to_node_id", "edge_type", name="uq_progression_edges_triple"),
        sa.CheckConstraint(
            "edge_type IN ('progression', 'regression', 'lateral')", name="ck_progression_edges_type"
        ),
    )
    op.create_index("ix_progression_edges_from", "progression_edges", ["from_node_id", "edge_type"])

    op.create_table(
        "workouts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("client_workout_id", sa.String(255), nullable=True),
    )
    op.create_index("ix_workouts_user_completed", "workouts", ["user_id", "completed_at"])
    op.create_index("ix_workouts_client_workout_id", "workouts", ["client_workout_id"])

    op.create_table(
        "set_logs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "workout_id",
            UUID(as_uuid=True),
            sa.ForeignKey("workouts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "node_id",
            UUID(as_uuid=True),
            sa.ForeignKey("progression_nodes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("set_number", sa.Integer, nullable=False),
        sa.Column("reps", sa.Integer, nullable=True),
        sa.Column("hold_secs", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_set_logs_workout_node", "set_logs", ["workout_id", "node_id"])

    op.create_table(
        "user_node_state",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "tree_id",
            UUID(as_uuid=True),
            sa.ForeignKey("progression_trees.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "current_node_id",
            UUID(as_uuid=True),
            sa.ForeignKey("progression_nodes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("unlocked_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("user_id", "tree_id", name="uq_user_node_state_user_tree"),
    )

    op.create_table(
        "tendon_strain_scores",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("joint_pathway", sa.String(50), nullable=False),
        sa.Column("score", sa.Float, nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_tendon_user_pathway_time", "tendon_strain_scores", ["user_id", "joint_pathway", "recorded_at"])

    # ---------------------------------------------------------------------#
    # PL/pgSQL: check_node_unlock_status
    # Returns is_unlocked, next_node_id, required_sets, completed_sets, metrics_summary
    # ---------------------------------------------------------------------#
    op.execute(
        """
        CREATE OR REPLACE FUNCTION check_node_unlock_status(
            p_user_id UUID,
            p_node_id UUID
        )
        RETURNS TABLE (
            is_unlocked BOOLEAN,
            next_node_id UUID,
            required_sets INT,
            completed_sets INT,
            metrics_summary JSONB
        )
        LANGUAGE plpgsql
        AS $$
        BEGIN
            RETURN QUERY
            WITH current_node_specs AS (
                SELECT
                    n.id AS node_id,
                    e.movement_type,
                    n.target_sets,
                    n.target_reps,
                    n.target_hold_secs,
                    (
                        SELECT to_node_id
                        FROM progression_edges pe
                        WHERE pe.from_node_id = n.id
                          AND pe.edge_type = 'progression'
                        ORDER BY pe.priority ASC NULLS LAST
                        LIMIT 1
                    ) AS next_node
                FROM progression_nodes n
                JOIN exercises e ON n.exercise_id = e.id
                WHERE n.id = p_node_id
            ),
            latest_user_workout AS (
                SELECT w.id AS workout_id
                FROM workouts w
                JOIN set_logs s ON s.workout_id = w.id
                WHERE w.user_id = p_user_id
                  AND s.node_id = p_node_id
                ORDER BY w.completed_at DESC
                LIMIT 1
            ),
            evaluated_working_sets AS (
                SELECT
                    s.reps,
                    s.hold_secs
                FROM set_logs s
                WHERE s.workout_id = (SELECT workout_id FROM latest_user_workout)
                  AND s.node_id = p_node_id
                ORDER BY s.set_number ASC
                LIMIT (SELECT target_sets FROM current_node_specs)
            ),
            performance_metrics AS (
                SELECT
                    COUNT(*)::INT as actual_sets,
                    COALESCE(MIN(reps), 0) as min_reps_achieved,
                    COALESCE(MIN(hold_secs), 0) as min_hold_achieved
                FROM evaluated_working_sets
            )
            SELECT
                CASE
                    WHEN pm.actual_sets >= cns.target_sets AND (
                        (cns.movement_type = 'isometric' AND pm.min_hold_achieved >= cns.target_hold_secs) OR
                        (cns.movement_type = 'isotonic' AND pm.min_reps_achieved >= cns.target_reps)
                    ) THEN TRUE
                    ELSE FALSE
                END as is_unlocked,
                cns.next_node as next_node_id,
                cns.target_sets as required_sets,
                pm.actual_sets as completed_sets,
                jsonb_build_object(
                    'movement_type', cns.movement_type,
                    'min_reps_achieved', pm.min_reps_achieved,
                    'min_hold_achieved', pm.min_hold_achieved,
                    'target_reps', cns.target_reps,
                    'target_hold_secs', cns.target_hold_secs
                ) as metrics_summary
            FROM current_node_specs cns
            CROSS JOIN performance_metrics pm;
        END;
        $$;
        """
    )

    # ---------------------------------------------------------------------#
    # Seed 3 trees × 10 nodes each, with edges wired
    # ---------------------------------------------------------------------#
    # We'll generate UUIDs deterministically so tests can reference them
    # by name. The function below creates the tree/exercise/node rows
    # in a single transaction and emits the node IDs to a temp table
    # so the edge-wiring step can reference them.
    # asyncpg doesn't support multi-statement prepared statements, so
    # each CREATE TEMP TABLE has to be its own op.execute() call.
    op.execute("CREATE TEMP TABLE seed_push_nodes (rank_level INT, node_id UUID) ON COMMIT DROP")
    op.execute("CREATE TEMP TABLE seed_pull_nodes (rank_level INT, node_id UUID) ON COMMIT DROP")
    op.execute("CREATE TEMP TABLE seed_core_nodes (rank_level INT, node_id UUID) ON COMMIT DROP")

    # --- Push tree: Vertical Push (Handstand Push-Up Path) ---
    push_nodes = [
        # (rank, exercise_name, movement, target_sets, target_reps, target_hold, min_fail_reps, min_fail_secs, intensity, pathways, video_url)
        (1, "Wall Push-Up",                       "isotonic",  3,  8, None,  3, None, 1.0, ["bent_arm_elbow", "bent_arm_shoulder"],                          "https://example.com/wall-pushup"),
        (2, "Incline Push-Up",                    "isotonic",  3,  8, None,  3, None, 1.0, ["bent_arm_elbow", "bent_arm_shoulder"],                          "https://example.com/incline-pushup"),
        (3, "Standard Push-Up",                   "isotonic",  3,  8, None,  3, None, 1.0, ["bent_arm_elbow", "bent_arm_shoulder"],                          "https://example.com/standard-pushup"),
        (4, "Diamond Push-Up",                    "isotonic",  3,  6, None,  3, None, 1.0, ["bent_arm_elbow", "bent_arm_shoulder"],                          "https://example.com/diamond-pushup"),
        (5, "Pike Push-Up",                       "isotonic",  3,  6, None,  3, None, 1.0, ["bent_arm_elbow", "bent_arm_shoulder", "wrist"],                 "https://example.com/pike-pushup"),
        (6, "Wall Handstand Hold",                "isometric",  3, None, 20, None, 10, 1.0, ["straight_arm_shoulder", "wrist"],                              "https://example.com/wall-hs-hold"),
        (7, "Wall Handstand Push-Up",             "isotonic",  3,  5, None,  2, None, 1.0, ["straight_arm_shoulder", "wrist"],                              "https://example.com/wall-hs-pushup"),
        (8, "Freestanding Handstand Hold",        "isometric",  3, None, 20, None, 10, 1.8, ["straight_arm_shoulder", "wrist"],                              "https://example.com/freestanding-hs-hold"),
        (9, "Freestanding Handstand Push-Up",     "isotonic",  3,  3, None,  1, None, 1.8, ["straight_arm_shoulder", "wrist"],                              "https://example.com/freestanding-hs-pushup"),
        (10, "Planche Push-Up (Rings)",           "isotonic",  3,  3, None,  1, None, 1.8, ["straight_arm_elbow", "straight_arm_shoulder", "wrist"],        "https://example.com/planche-pushup"),
    ]
    _seed_tree(
        slug="push_handstand_pushup_path",
        name="Vertical Push (Handstand Push-Up Path)",
        description="From wall push-up to planche push-up. Builds toward a freestanding handstand push-up.",
        nodes=push_nodes,
        temp_table="seed_push_nodes",
    )

    # --- Pull tree: Horizontal Pull (Front Lever Path) ---
    pull_nodes = [
        (1, "Dead Hang",                          "isometric",  3, None, 20, None, 10, 1.0, ["bent_arm_shoulder", "wrist"],                                  "https://example.com/dead-hang"),
        (2, "Active Hang",                        "isometric",  3, None, 15, None,  8, 1.0, ["bent_arm_shoulder", "core_lumbar"],                            "https://example.com/active-hang"),
        (3, "Scapular Pulls",                     "isotonic",   3,  8, None,  3, None, 1.0, ["bent_arm_shoulder", "core_lumbar"],                            "https://example.com/scapular-pulls"),
        (4, "Negative Pull-Up",                   "isotonic",   3,  3, None,  1, None, 1.0, ["bent_arm_shoulder", "bent_arm_elbow", "core_lumbar"],          "https://example.com/negative-pullup"),
        (5, "Pull-Up",                            "isotonic",   3,  5, None,  2, None, 1.0, ["bent_arm_shoulder", "bent_arm_elbow", "core_lumbar"],          "https://example.com/pullup"),
        (6, "Tuck Front Lever Hold",              "isometric",  3, None, 12, None,  8, 1.8, ["straight_arm_shoulder", "core_lumbar"],                        "https://example.com/tuck-fl"),
        (7, "Advanced Tuck Front Lever Hold",     "isometric",  3, None, 12, None,  8, 1.8, ["straight_arm_shoulder", "core_lumbar"],                        "https://example.com/adv-tuck-fl"),
        (8, "Straddle Front Lever Hold",          "isometric",  3, None, 10, None,  6, 1.8, ["straight_arm_shoulder", "core_lumbar"],                        "https://example.com/straddle-fl"),
        (9, "Full Front Lever Hold",              "isometric",  3, None,  8, None,  5, 1.8, ["straight_arm_shoulder", "core_lumbar"],                        "https://example.com/full-fl"),
        (10, "Front Lever Pull",                  "isotonic",  3,  3, None,  1, None, 1.8, ["straight_arm_shoulder", "straight_arm_elbow", "core_lumbar"],  "https://example.com/front-lever-pull"),
    ]
    _seed_tree(
        slug="pull_front_lever_path",
        name="Horizontal Pull (Front Lever Path)",
        description="From dead hang to front lever pull. Builds toward a full front lever.",
        nodes=pull_nodes,
        temp_table="seed_pull_nodes",
    )

    # --- Core tree: Core (Dragon Flag Path) ---
    core_nodes = [
        (1, "Plank",                              "isometric",  3, None, 20, None, 10, 1.0, ["core_lumbar"],                                                  "https://example.com/plank"),
        (2, "Side Plank",                         "isometric",  3, None, 20, None, 10, 1.0, ["core_lumbar"],                                                  "https://example.com/side-plank"),
        (3, "Hollow Body Hold",                   "isometric",  3, None, 20, None, 10, 1.0, ["core_lumbar", "core_hip_flexor"],                              "https://example.com/hollow-hold"),
        (4, "L-Sit (Floor)",                      "isometric",  3, None, 15, None,  8, 1.0, ["core_lumbar", "core_hip_flexor"],                              "https://example.com/l-sit-floor"),
        (5, "L-Sit (Parallel Bars)",              "isometric",  3, None, 12, None,  8, 1.0, ["core_lumbar", "core_hip_flexor", "bent_arm_shoulder"],         "https://example.com/l-sit-bars"),
        (6, "Hanging Leg Raise (Toes-to-Bar)",    "isotonic",   3,  6, None,  3, None, 1.0, ["core_lumbar", "core_hip_flexor", "bent_arm_shoulder"],         "https://example.com/toes-to-bar"),
        (7, "Tuck Dragon Flag",                   "isotonic",   3,  5, None,  2, None, 1.0, ["core_lumbar"],                                                  "https://example.com/tuck-dragon"),
        (8, "Advanced Tuck Dragon Flag",          "isotonic",   3,  4, None,  2, None, 1.0, ["core_lumbar"],                                                  "https://example.com/adv-tuck-dragon"),
        (9, "Straddle Dragon Flag",               "isotonic",   3,  3, None,  1, None, 1.8, ["core_lumbar"],                                                  "https://example.com/straddle-dragon"),
        (10, "Full Dragon Flag",                  "isotonic",  3,  3, None,  1, None, 1.8, ["core_lumbar"],                                                  "https://example.com/full-dragon"),
    ]
    _seed_tree(
        slug="core_dragon_flag_path",
        name="Core (Dragon Flag Path)",
        description="From plank to full dragon flag. Builds toward a strict dragon flag.",
        nodes=core_nodes,
        temp_table="seed_core_nodes",
    )

    # ---------------------------------------------------------------------#
    # Wire edges: linear progression + 1-2 regressions per node + occasional lateral
    # ---------------------------------------------------------------------#
    # asyncpg rejects prepared statements with more than one SQL command,
    # so each INSERT is its own op.execute() call. The comments next to
    # each call describe what the edge semantically represents.
    op.execute(
        # Push tree edges
        "INSERT INTO progression_edges (from_node_id, to_node_id, edge_type, priority) "
        "SELECT a.node_id, b.node_id, 'progression', NULL "
        "FROM seed_push_nodes a JOIN seed_push_nodes b ON b.rank_level = a.rank_level + 1"
    )
    op.execute(
        # Push tree: regression from rank 8 (freestanding HS hold) -> rank 6 (wall HS hold)
        "INSERT INTO progression_edges (from_node_id, to_node_id, edge_type, priority) "
        "SELECT a.node_id, b.node_id, 'regression', 1 "
        "FROM seed_push_nodes a JOIN seed_push_nodes b ON b.rank_level = 6 "
        "WHERE a.rank_level = 8"
    )
    op.execute(
        # Pull tree edges
        "INSERT INTO progression_edges (from_node_id, to_node_id, edge_type, priority) "
        "SELECT a.node_id, b.node_id, 'progression', NULL "
        "FROM seed_pull_nodes a JOIN seed_pull_nodes b ON b.rank_level = a.rank_level + 1"
    )
    op.execute(
        # Pull tree: tuck FL regresses to dead hang AND active hang
        "INSERT INTO progression_edges (from_node_id, to_node_id, edge_type, priority) "
        "SELECT a.node_id, b.node_id, 'regression', p "
        "FROM seed_pull_nodes a "
        "CROSS JOIN (VALUES (1, 1), (2, 2)) AS targets(rr, p) "
        "JOIN seed_pull_nodes b ON b.rank_level = targets.rr "
        "WHERE a.rank_level = 6"
    )
    op.execute(
        # Pull tree: straddle FL -> advanced tuck FL (lateral move — same rank family, different style)
        "INSERT INTO progression_edges (from_node_id, to_node_id, edge_type, priority) "
        "SELECT a.node_id, b.node_id, 'lateral', NULL "
        "FROM seed_pull_nodes a JOIN seed_pull_nodes b ON b.rank_level = 7 "
        "WHERE a.rank_level = 8"
    )
    op.execute(
        # Core tree edges
        "INSERT INTO progression_edges (from_node_id, to_node_id, edge_type, priority) "
        "SELECT a.node_id, b.node_id, 'progression', NULL "
        "FROM seed_core_nodes a JOIN seed_core_nodes b ON b.rank_level = a.rank_level + 1"
    )
    op.execute(
        # Core tree: hanging leg raise regresses to L-sit on bars (priority 1) and L-sit on floor (priority 2)
        "INSERT INTO progression_edges (from_node_id, to_node_id, edge_type, priority) "
        "SELECT a.node_id, b.node_id, 'regression', p "
        "FROM seed_core_nodes a "
        "CROSS JOIN (VALUES (5, 1), (4, 2)) AS targets(rr, p) "
        "JOIN seed_core_nodes b ON b.rank_level = targets.rr "
        "WHERE a.rank_level = 6"
    )


def downgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS check_node_unlock_status(UUID, UUID)")
    op.drop_table("tendon_strain_scores")
    op.drop_table("user_node_state")
    op.drop_table("set_logs")
    op.drop_table("workouts")
    op.drop_table("progression_edges")
    op.drop_table("progression_nodes")
    op.drop_table("progression_trees")
    op.drop_table("exercises")
    op.drop_table("users")


def _seed_tree(slug: str, name: str, description: str, nodes: list, temp_table: str) -> None:
    """Helper: insert a tree, its exercises, its nodes, and capture node UUIDs by rank."""
    tree_id = uuid.uuid5(uuid.NAMESPACE_DNS, f"calisthenics:tree:{slug}")
    conn = op.get_bind()

    conn.execute(
        sa.text(
            "INSERT INTO progression_trees (id, name, description, slug) VALUES (:id, :name, :description, :slug)"
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
        # Stable exercise UUID per name (so re-running the migration is idempotent)
        ex_id = uuid.uuid5(uuid.NAMESPACE_DNS, f"calisthenics:exercise:{ex_name}")
        conn.execute(
            sa.text(
                "INSERT INTO exercises (id, name, movement_type, primary_muscles, secondary_muscles, video_url) "
                "VALUES (:id, :name, :movement, :primary, :secondary, :video)"
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
                "VALUES (:id, :tree_id, :exercise_id, :rank, :target_sets, :target_reps, :target_hold, :min_fail_reps, :min_fail_secs, :pathways, :intensity)"
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
