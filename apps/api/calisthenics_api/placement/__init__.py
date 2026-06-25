"""Placement algorithm: pure functions for binary-search archetype + RIR-2 sub-maximal test.

Source: spec doc section 1 (Algorithmic Archetyping + Sub-Maximal Proxy Test).

The 3-question binary tree:

    Q1: Can you perform 1 clean pull-up?
                    /          \\
                Yes             No
               /                   \\
    Q2: 15s support hold on    Q3: 10s active hang
        parallel bars?         from bar?
            /     \\               /     \\
         Yes       No           Yes       No
          |         |             |         |
    Intermediate Novice B     Novice A   Beginner

RIR-2 sub-maximal test (pushup variant per the spec, but the function
takes any rep count):

    <5 reps   -> offset -2  (place 2 nodes behind baseline)
    5..12 reps -> offset  0  (place at baseline node)
    >12 reps  -> offset +1  (place 1 node ahead of baseline)

`place_user` then walks a tree in rank_level order from the lowest
node up, applying the offset to land on a real node.
"""

from __future__ import annotations

import uuid
from typing import Literal

# Archetypes the spec defines
Archetype = Literal["beginner", "novice_a", "novice_b", "intermediate"]
EdgeKind = Literal["progression", "regression", "lateral"]


def assess_archetype(answers: dict) -> Archetype:
    """Return one of the four archetypes given the answers to Q1/Q2/Q3.

    Expected keys in `answers`:
        can_pull_up (bool)         -> Q1
        support_hold_15s (bool)    -> Q2, only meaningful if can_pull_up is True
        active_hang_10s (bool)     -> Q3, only meaningful if can_pull_up is False

    Raises ValueError on impossible combinations.
    """
    if not isinstance(answers, dict):
        raise ValueError("answers must be a dict")

    q1 = bool(answers.get("can_pull_up", False))

    if q1:
        q2 = bool(answers.get("support_hold_15s", False))
        return "intermediate" if q2 else "novice_b"
    else:
        q3 = bool(answers.get("active_hang_10s", False))
        return "novice_a" if q3 else "beginner"


# RIR-2 thresholds per the spec. Strictly: <5, 5..12, >12.
def rir2_placement(rep_count: int) -> int:
    """Map raw rep count to a node-offset relative to the tree baseline.

    Returns:
        -2 if rep_count < 5
         0 if 5 <= rep_count <= 12
        +1 if rep_count > 12

    rep_count must be >= 0. Negative values are treated as 0.
    """
    if rep_count < 0:
        raise ValueError(f"rep_count must be >= 0, got {rep_count}")
    if rep_count < 5:
        return -2
    if rep_count > 12:
        return 1
    return 0


# Baseline rank per archetype (where the user starts if RIR-2 lands on offset 0)
ARCHETYPE_BASELINE_RANK: dict[Archetype, int] = {
    "beginner": 1,
    "novice_a": 2,
    "novice_b": 3,
    "intermediate": 4,
}


def place_user(
    archetype: Archetype,
    rir2_reps: int,
    nodes_by_rank: dict[int, uuid.UUID],
) -> uuid.UUID:
    """Resolve the final node UUID for a user given archetype + RIR-2 result.

    `nodes_by_rank` is the tree's rank_level -> node_id map (must be contiguous
    from 1..max_rank; gaps produce ValueError). The returned node_id is
    clamped to the existing ranks — if the offset falls off either end of the
    tree, the nearest available node wins.

    This is a pure function: no I/O, no DB. The caller fetches `nodes_by_rank`
    and passes it in. Phase 1 has only 3 seeded trees with ~10 nodes each, so
    pulling all node ranks per tree is cheap.
    """
    if not nodes_by_rank:
        raise ValueError("nodes_by_rank is empty")

    if archetype not in ARCHETYPE_BASELINE_RANK:
        raise ValueError(f"unknown archetype: {archetype!r}")

    baseline = ARCHETYPE_BASELINE_RANK[archetype]
    offset = rir2_placement(rir2_reps)
    target = baseline + offset

    ranks = sorted(nodes_by_rank.keys())
    min_rank, max_rank = ranks[0], ranks[-1]

    # Contiguity check (every integer in [min..max] must be present)
    if ranks != list(range(min_rank, max_rank + 1)):
        raise ValueError(
            f"nodes_by_rank must be contiguous 1..N, got ranks={ranks} "
            f"(gaps would be silently dropped if we don't check)"
        )

    # Clamp to the tree's range
    target = max(min_rank, min(max_rank, target))

    return nodes_by_rank[target]


__all__ = [
    "ARCHETYPE_BASELINE_RANK",
    "Archetype",
    "assess_archetype",
    "place_user",
    "rir2_placement",
]
