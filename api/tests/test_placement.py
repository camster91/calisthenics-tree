"""Unit tests for the placement module (assess_archetype, rir2_placement, place_user)."""

from __future__ import annotations

import uuid

import pytest

from calisthenics_api.placement import (
    ARCHETYPE_BASELINE_RANK,
    assess_archetype,
    place_user,
    rir2_placement,
)


# -----------------------------------------------------------------------------#
# assess_archetype
# -----------------------------------------------------------------------------#


class TestAssessArchetype:
    def test_intermediate_path(self):
        assert (
            assess_archetype({"can_pull_up": True, "support_hold_15s": True}) == "intermediate"
        )

    def test_novice_b_path(self):
        assert (
            assess_archetype({"can_pull_up": True, "support_hold_15s": False}) == "novice_b"
        )

    def test_novice_a_path(self):
        assert (
            assess_archetype({"can_pull_up": False, "active_hang_10s": True}) == "novice_a"
        )

    def test_beginner_path(self):
        assert (
            assess_archetype({"can_pull_up": False, "active_hang_10s": False}) == "beginner"
        )

    def test_defaults_apply(self):
        # Empty dict = all False = beginner
        assert assess_archetype({}) == "beginner"

    def test_rejects_non_dict(self):
        with pytest.raises(ValueError):
            assess_archetype("not a dict")  # type: ignore[arg-type]


# -----------------------------------------------------------------------------#
# rir2_placement
# -----------------------------------------------------------------------------#


class TestRir2Placement:
    @pytest.mark.parametrize("reps,expected", [
        (0, -2),
        (1, -2),
        (4, -2),
        (5, 0),
        (8, 0),
        (12, 0),
        (13, 1),
        (100, 1),
    ])
    def test_thresholds(self, reps, expected):
        assert rir2_placement(reps) == expected

    def test_rejects_negative(self):
        with pytest.raises(ValueError):
            rir2_placement(-1)


# -----------------------------------------------------------------------------#
# place_user
# -----------------------------------------------------------------------------#


def _tree(n_ranks: int) -> dict[int, uuid.UUID]:
    """Build a contiguous 1..N tree of UUIDs."""
    return {i: uuid.uuid4() for i in range(1, n_ranks + 1)}


class TestPlaceUser:
    def test_beginner_at_5_reps_lands_on_baseline(self):
        # beginner baseline = 1, rir2 offset 0 -> rank 1
        tree = _tree(10)
        assert place_user("beginner", 8, tree) == tree[1]

    def test_intermediate_at_13_reps_lands_one_ahead(self):
        # intermediate baseline = 4, offset +1 -> rank 5
        tree = _tree(10)
        assert place_user("intermediate", 13, tree) == tree[5]

    def test_beginner_at_1_rep_lands_two_behind(self):
        # beginner baseline = 1, offset -2 -> rank -1 -> clamped to 1
        tree = _tree(10)
        assert place_user("beginner", 1, tree) == tree[1]

    def test_intermediate_at_2_reps_lands_two_behind(self):
        # intermediate baseline = 4, offset -2 -> rank 2
        tree = _tree(10)
        assert place_user("intermediate", 2, tree) == tree[2]

    def test_novice_a_at_8_reps(self):
        # novice_a baseline = 2, offset 0 -> rank 2
        tree = _tree(10)
        assert place_user("novice_a", 8, tree) == tree[2]

    def test_novice_b_at_5_reps(self):
        # novice_b baseline = 3, offset 0 -> rank 3
        tree = _tree(10)
        assert place_user("novice_b", 5, tree) == tree[3]

    def test_clamp_to_max_rank(self):
        # intermediate + offset +1 + small tree = clamps to top
        tree = _tree(3)
        # intermediate baseline = 4, tree max = 3, clamped
        assert place_user("intermediate", 13, tree) == tree[3]

    def test_clamp_to_min_rank(self):
        # beginner + offset -2 + small tree = clamped to bottom
        tree = _tree(3)
        assert place_user("beginner", 0, tree) == tree[1]

    def test_rejects_empty_tree(self):
        with pytest.raises(ValueError):
            place_user("beginner", 5, {})

    def test_rejects_gapped_tree(self):
        with pytest.raises(ValueError, match="contiguous"):
            # Gap at rank 3
            place_user("beginner", 5, {1: uuid.uuid4(), 2: uuid.uuid4(), 4: uuid.uuid4()})

    def test_rejects_unknown_archetype(self):
        with pytest.raises(ValueError, match="unknown archetype"):
            place_user("wizard", 5, _tree(10))  # type: ignore[arg-type]

    def test_baseline_table_matches_spec(self):
        # Per the spec, the 4 archetypes map to distinct baselines
        assert ARCHETYPE_BASELINE_RANK == {
            "beginner": 1,
            "novice_a": 2,
            "novice_b": 3,
            "intermediate": 4,
        }
