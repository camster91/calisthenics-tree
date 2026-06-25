"""Unit tests for the tendon module (calc_strain, rolling_4wk_average, find_deload_alerts, pick_regression)."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest

from calisthenics_api.tendon import (
    DELOAD_RATIO,
    ROLLING_WINDOW_DAYS,
    RegressionCandidate,
    SetInput,
    calc_strain,
    find_deload_alerts,
    pick_regression,
    rolling_4wk_average,
)


NOW = datetime(2026, 6, 25, 12, 0, tzinfo=timezone.utc)


def _set(
    pathway: str,
    duration_or_reps: int,
    rank: int = 5,
    intensity: float = 1.0,
    node: uuid.UUID | None = None,
) -> SetInput:
    return SetInput(
        node_id=node or uuid.uuid4(),
        joint_pathway=pathway,
        intensity_factor=intensity,
        rank_level=rank,
        duration_or_reps=duration_or_reps,
    )


# -----------------------------------------------------------------------------#
# calc_strain
# -----------------------------------------------------------------------------#


class TestCalcStrain:
    def test_straight_arm_isometric(self):
        # 1.8 * 10s * rank 5 = 90
        sets = [_set("straight_arm_elbow", 10, rank=5, intensity=1.8)]
        assert calc_strain(sets) == {"straight_arm_elbow": 90.0}

    def test_bent_arm_isotonic(self):
        # 1.0 * 5 reps * rank 3 = 15
        sets = [_set("bent_arm_elbow", 5, rank=3, intensity=1.0)]
        assert calc_strain(sets) == {"bent_arm_elbow": 15.0}

    def test_sums_within_pathway(self):
        sets = [
            _set("straight_arm_elbow", 10, rank=5, intensity=1.8),
            _set("straight_arm_elbow", 8, rank=5, intensity=1.8),
        ]
        # 90 + 72 = 162
        assert calc_strain(sets) == {"straight_arm_elbow": 162.0}

    def test_keeps_pathways_independent(self):
        sets = [
            _set("straight_arm_elbow", 10, rank=5, intensity=1.8),
            _set("bent_arm_elbow", 10, rank=3, intensity=1.0),
        ]
        result = calc_strain(sets)
        assert result == {
            "straight_arm_elbow": 90.0,
            "bent_arm_elbow": 30.0,
        }

    def test_skips_zero_duration_sets(self):
        sets = [
            _set("bent_arm_elbow", 0, rank=3, intensity=1.0),
            _set("bent_arm_elbow", 5, rank=3, intensity=1.0),
        ]
        assert calc_strain(sets) == {"bent_arm_elbow": 15.0}

    def test_empty_input_returns_empty(self):
        assert calc_strain([]) == {}

    def test_rejects_negative_intensity(self):
        sets = [_set("bent_arm_elbow", 5, intensity=-1.0)]
        with pytest.raises(ValueError, match="intensity_factor"):
            calc_strain(sets)

    def test_rejects_zero_rank(self):
        sets = [_set("bent_arm_elbow", 5, rank=0)]
        with pytest.raises(ValueError, match="rank_level"):
            calc_strain(sets)


# -----------------------------------------------------------------------------#
# rolling_4wk_average
# -----------------------------------------------------------------------------#


class TestRolling4wkAverage:
    def test_empty_history_returns_zero(self):
        assert rolling_4wk_average("bent_arm_elbow", [], now=NOW) == 0.0

    def test_in_window_averages(self):
        history = [
            (NOW - timedelta(days=7), 100.0),
            (NOW - timedelta(days=14), 200.0),
            (NOW - timedelta(days=21), 300.0),
        ]
        assert rolling_4wk_average("bent_arm_elbow", history, now=NOW) == 200.0

    def test_drops_outside_window(self):
        history = [
            (NOW - timedelta(days=1), 100.0),
            (NOW - timedelta(days=40), 999.0),  # too old
        ]
        assert rolling_4wk_average("bent_arm_elbow", history, now=NOW) == 100.0

    def test_drops_future_entries(self):
        history = [
            (NOW - timedelta(days=1), 100.0),
            (NOW + timedelta(days=1), 999.0),  # in the future
        ]
        assert rolling_4wk_average("bent_arm_elbow", history, now=NOW) == 100.0

    def test_window_is_28_days(self):
        # 28 days ago is in the window (cutoff < recorded_at <= now)
        history = [
            (NOW - timedelta(days=28), 100.0),
            (NOW - timedelta(days=29), 200.0),
        ]
        # The 28-day entry is exactly at the boundary; 29-day is out
        assert rolling_4wk_average("bent_arm_elbow", history, now=NOW) == 100.0
        assert ROLLING_WINDOW_DAYS == 28

    def test_handles_naive_datetimes_as_utc(self):
        naive = (NOW - timedelta(days=5)).replace(tzinfo=None)
        history = [(naive, 100.0)]
        assert rolling_4wk_average("bent_arm_elbow", history, now=NOW) == 100.0


# -----------------------------------------------------------------------------#
# find_deload_alerts
# -----------------------------------------------------------------------------#


class TestFindDeloadAlerts:
    def test_no_alert_when_below_150_percent(self):
        # current 100, avg 100, ratio 1.0
        alerts = find_deload_alerts(
            {"bent_arm_elbow": 100.0},
            {"bent_arm_elbow": [(NOW - timedelta(days=7), 100.0)]},
            now=NOW,
        )
        assert alerts["bent_arm_elbow"]["deload_alert"] is False
        assert alerts["bent_arm_elbow"]["ratio"] == 1.0

    def test_alert_when_above_150_percent(self):
        # current 200, avg 100, ratio 2.0
        alerts = find_deload_alerts(
            {"bent_arm_elbow": 200.0},
            {"bent_arm_elbow": [(NOW - timedelta(days=7), 100.0)]},
            now=NOW,
        )
        assert alerts["bent_arm_elbow"]["deload_alert"] is True

    def test_exactly_150_percent_does_not_alert(self):
        # Spec says "exceeds 150%" — strict greater than, not >=
        alerts = find_deload_alerts(
            {"bent_arm_elbow": 150.0},
            {"bent_arm_elbow": [(NOW - timedelta(days=7), 100.0)]},
            now=NOW,
        )
        assert alerts["bent_arm_elbow"]["deload_alert"] is False
        assert alerts["bent_arm_elbow"]["ratio"] == 1.5
        assert DELOAD_RATIO == 1.5

    def test_no_alert_without_history(self):
        # No baseline = no alert
        alerts = find_deload_alerts(
            {"bent_arm_elbow": 999.0},
            {},
            now=NOW,
        )
        assert alerts["bent_arm_elbow"]["deload_alert"] is False
        assert alerts["bent_arm_elbow"]["rolling_avg_4wk"] == 0.0

    def test_multi_pathway_independence(self):
        # straight_arm_elbow: avg 100, current 200 -> alert
        # bent_arm_elbow: avg 100, current 50 -> no alert
        history = {
            "straight_arm_elbow": [(NOW - timedelta(days=7), 100.0)],
            "bent_arm_elbow": [(NOW - timedelta(days=7), 100.0)],
        }
        alerts = find_deload_alerts(
            {
                "straight_arm_elbow": 200.0,
                "bent_arm_elbow": 50.0,
            },
            history,
            now=NOW,
        )
        assert alerts["straight_arm_elbow"]["deload_alert"] is True
        assert alerts["bent_arm_elbow"]["deload_alert"] is False


# -----------------------------------------------------------------------------#
# pick_regression
# -----------------------------------------------------------------------------#


class TestPickRegression:
    def test_picks_lowest_priority(self):
        from_node = uuid.uuid4()
        cands = [
            RegressionCandidate(from_node_id=from_node, to_node_id=uuid.uuid4(), priority=3),
            RegressionCandidate(from_node_id=from_node, to_node_id=uuid.uuid4(), priority=1),
            RegressionCandidate(from_node_id=from_node, to_node_id=uuid.uuid4(), priority=2),
        ]
        result = pick_regression(from_node, cands)
        assert result == cands[1].to_node_id

    def test_handles_all_null_priorities(self):
        from_node = uuid.uuid4()
        target = uuid.uuid4()
        cands = [
            RegressionCandidate(from_node_id=from_node, to_node_id=target, priority=None),
            RegressionCandidate(from_node_id=from_node, to_node_id=uuid.uuid4(), priority=None),
        ]
        assert pick_regression(from_node, cands) == target

    def test_no_candidates(self):
        assert pick_regression(uuid.uuid4(), []) is None

    def test_no_matching_from_node(self):
        from_node = uuid.uuid4()
        cands = [
            RegressionCandidate(from_node_id=uuid.uuid4(), to_node_id=uuid.uuid4(), priority=1),
        ]
        assert pick_regression(from_node, cands) is None
