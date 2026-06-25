"""Tendon & joint-overload prevention engine.

Source: spec doc section 4 (Cumulative Strain Calculation + Dynamic Deload Alerts).

S_tendon = SUM_over_sets ( IntensityFactor * DurationOrReps * RankLevel )

IntensityFactor:
    straight-arm holds (isometric, intensity_factor=1.8)  = 1.8
    bent-arm holds / dynamic (intensity_factor=1.0)       = 1.0

R is the rank_level of the node (1..10).

Deload trigger: if S_tendon for a joint pathway exceeds 150% of the user's
running 4-week rolling average, return deload_alert=True with a
recommended regression node (the highest-priority regression edge from
the offending node, if any).
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

# Threshold per the spec: "exceeds 150% of running 4-week rolling average"
DELOAD_RATIO = 1.50
ROLLING_WINDOW_DAYS = 28  # 4 weeks


@dataclass(frozen=True)
class SetInput:
    """One set the user just performed.

    Use `duration_or_reps` so the same function covers isometrics (secs) and
    isotonics (reps). Whichever is relevant for the movement_type.
    """

    node_id: uuid.UUID
    joint_pathway: str
    intensity_factor: float
    rank_level: int
    duration_or_reps: int = 0  # hold_secs for isometric, reps for isotonic


@dataclass(frozen=True)
class RegressionCandidate:
    """A regression edge to recommend in the deload alert."""

    from_node_id: uuid.UUID
    to_node_id: uuid.UUID
    priority: int | None  # lower = preferred


def calc_strain(sets: list[SetInput]) -> dict[str, float]:
    """Sum the strain per joint_pathway.

    Returns {pathway: total_score}. Empty input -> {}.
    """
    totals: dict[str, float] = {}
    for s in sets:
        if s.duration_or_reps <= 0:
            # zero-rep / zero-sec sets are not load-bearing; skip
            continue
        if s.intensity_factor < 0:
            raise ValueError(f"intensity_factor must be >= 0, got {s.intensity_factor}")
        if s.rank_level < 1:
            raise ValueError(f"rank_level must be >= 1, got {s.rank_level}")
        score = s.intensity_factor * s.duration_or_reps * s.rank_level
        totals[s.joint_pathway] = totals.get(s.joint_pathway, 0.0) + score
    return totals


def rolling_4wk_average(
    pathway: str,
    history: list[tuple[datetime, float]],
    now: datetime | None = None,
) -> float:
    """Return the mean of the historical scores for `pathway` over the last 28 days.

    `history` is a list of (recorded_at, score) for THIS pathway only —
    the caller is responsible for filtering to one pathway.

    Uses a strict 28-day window (now - 28d, now]. Future-dated entries are
    dropped. An empty window returns 0.0 (no baseline means no deload).
    """
    if now is None:
        now = datetime.now(timezone.utc)

    cutoff = now - timedelta(days=ROLLING_WINDOW_DAYS)
    in_window: list[float] = []
    for recorded_at, score in history:
        # Naive datetimes are assumed UTC for comparison
        if recorded_at.tzinfo is None:
            recorded_at = recorded_at.replace(tzinfo=timezone.utc)
        # Inclusive on the low end (28 days ago counts as in the window)
        if cutoff <= recorded_at <= now:
            in_window.append(float(score))
    if not in_window:
        return 0.0
    return sum(in_window) / len(in_window)


def find_deload_alerts(
    current_strain: dict[str, float],
    history_by_pathway: dict[str, list[tuple[datetime, float]]],
    now: datetime | None = None,
) -> dict[str, dict]:
    """For each pathway in current_strain, return an alert dict if it exceeds 150% of the
    running 4-week average. Pathways with no history are NOT flagged (no baseline yet).

    Alert shape per pathway:
        {
            "current_score": float,
            "rolling_avg_4wk": float,
            "ratio": float,
            "deload_alert": bool,
        }
    """
    out: dict[str, dict] = {}
    for pathway, current in current_strain.items():
        history = history_by_pathway.get(pathway, [])
        avg = rolling_4wk_average(pathway, history, now=now)
        if avg <= 0:
            # No history — can't decide, no alert
            out[pathway] = {
                "current_score": current,
                "rolling_avg_4wk": 0.0,
                "ratio": 0.0,
                "deload_alert": False,
            }
            continue
        ratio = current / avg
        out[pathway] = {
            "current_score": current,
            "rolling_avg_4wk": avg,
            "ratio": ratio,
            "deload_alert": ratio > DELOAD_RATIO,  # strictly >, not >=
        }
    return out


def pick_regression(
    from_node_id: uuid.UUID,
    candidates: list[RegressionCandidate],
) -> uuid.UUID | None:
    """Choose the recommended regression node from a list of candidates.

    Selection rule: lowest non-null priority wins. If all priorities are null,
    the first candidate wins (stable insertion order).
    """
    if not candidates:
        return None
    # Filter to candidates originating from the right node
    valid = [c for c in candidates if c.from_node_id == from_node_id]
    if not valid:
        return None
    valid.sort(key=lambda c: (c.priority is None, c.priority if c.priority is not None else 0))
    return valid[0].to_node_id


__all__ = [
    "DELOAD_RATIO",
    "ROLLING_WINDOW_DAYS",
    "RegressionCandidate",
    "SetInput",
    "calc_strain",
    "find_deload_alerts",
    "pick_regression",
    "rolling_4wk_average",
]
