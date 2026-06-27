"""API integration tests for the 3 endpoints + auth.

Requires a running Postgres with the migration applied. Skipped otherwise.
"""

from __future__ import annotations

import os

import pytest

DATABASE_URL = os.environ.get("DATABASE_URL", "")
BEARER_TOKEN = os.environ.get("BEARER_TOKEN", "dev-bearer-token-replace-me")

pytestmark = pytest.mark.skipif(not DATABASE_URL, reason="DATABASE_URL not set; no DB for API integration test")


@pytest.fixture
def client():
    """Yield a TestClient with the FastAPI app."""
    from fastapi.testclient import TestClient

    from calisthenics_api.main import create_app

    app = create_app()
    with TestClient(app) as c:
        yield c


def test_healthz_no_auth(client):
    r = client.get("/healthz")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "version" in body


def test_progressions_requires_auth(client):
    r = client.get("/api/v1/users/me/progressions")
    assert r.status_code == 401


def test_progressions_with_auth_returns_empty(client):
    r = client.get(
        "/api/v1/users/me/progressions",
        headers={"Authorization": f"Bearer {BEARER_TOKEN}"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["user_id"].startswith("usr_")
    assert "active_progressions" in body
    # First call: no placements yet
    assert body["active_progressions"] == []


def test_onboarding_place_returns_one_per_tree(client):
    payload = {
        "answers": {
            "can_pull_up": True,
            "support_hold_15s": True,  # intermediate
            "active_hang_10s": False,
            "rir2_pushup_reps": 8,  # offset 0
        }
    }
    r = client.post(
        "/api/v1/onboarding/place",
        json=payload,
        headers={"Authorization": f"Bearer {BEARER_TOKEN}"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["archetype"] == "intermediate"
    assert body["rir2_offset"] == 0
    # 3 seeded trees => 3 placements
    assert len(body["placements"]) == 3
    for p in body["placements"]:
        assert p["tree_id"].startswith("tree_")
        assert p["starting_node_id"].startswith("node_")
        # Intermediate baseline is 4; +0 offset = 4
        assert p["starting_rank"] == 4


def test_progressions_after_placement(client):
    # Place first
    payload = {
        "answers": {
            "can_pull_up": False,
            "support_hold_15s": False,
            "active_hang_10s": False,  # beginner
            "rir2_pushup_reps": 0,  # offset -2, clamped to 1
        }
    }
    r = client.post(
        "/api/v1/onboarding/place",
        json=payload,
        headers={"Authorization": f"Bearer {BEARER_TOKEN}"},
    )
    assert r.status_code == 200

    # Then read progressions
    r = client.get(
        "/api/v1/users/me/progressions",
        headers={"Authorization": f"Bearer {BEARER_TOKEN}"},
    )
    assert r.status_code == 200
    body = r.json()
    assert len(body["active_progressions"]) == 3
    for p in body["active_progressions"]:
        # beginner + offset -2 -> rank 1 (clamped)
        assert p["current_node"]["target_sets"] >= 1
        assert p["current_node"]["exercise_name"]


def test_workouts_sync_idempotent(client):
    # Place first so we have a node to log against
    client.post(
        "/api/v1/onboarding/place",
        json={
            "answers": {
                "can_pull_up": True,
                "support_hold_15s": True,
                "active_hang_10s": False,
                "rir2_pushup_reps": 8,
            }
        },
        headers={"Authorization": f"Bearer {BEARER_TOKEN}"},
    )
    # Get the Tuck FL node id from progressions
    r = client.get(
        "/api/v1/users/me/progressions",
        headers={"Authorization": f"Bearer {BEARER_TOKEN}"},
    )
    body = r.json()
    pull_prog = next(p for p in body["active_progressions"] if "Pull" in p["tree_name"])
    node_id = pull_prog["current_node"]["node_id"]

    payload = {
        "sync_client_timestamp": "2026-06-25T12:00:00Z",
        "workouts": [
            {
                "client_workout_id": "test-client-wk-1",
                "completed_at": "2026-06-24T18:00:00Z",
                "logs": [
                    {
                        "node_id": node_id,
                        "sets": [
                            {"set_number": 1, "hold_secs": 15, "reps": None},
                            {"set_number": 2, "hold_secs": 12, "reps": None},
                            {"set_number": 3, "hold_secs": 8, "reps": None},
                        ],
                    }
                ],
            }
        ],
    }

    r = client.post(
        "/api/v1/workouts/sync",
        json=payload,
        headers={"Authorization": f"Bearer {BEARER_TOKEN}"},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "success"
    assert body["synced_workout_count"] == 1
    # Set 3 at 8s is below the Tuck FL min_fail_threshold_secs of 8 — wait, equal is allowed.
    # Spec: "If the completed capacity of a set drops below the defined threshold: REGRESS"
    # "below" is strict <. 8 < 8 is false, so no regression.
    # Promotion: min hold of 8s < target_hold of 12s, so no promotion either.
    # So state_updates should be empty here.
    assert body["state_updates"]["promotions"] == []
    assert body["state_updates"]["regressions"] == []

    # Resending same client_workout_id is a no-op (idempotency)
    r2 = client.post(
        "/api/v1/workouts/sync",
        json=payload,
        headers={"Authorization": f"Bearer {BEARER_TOKEN}"},
    )
    assert r2.status_code == 201
    body2 = r2.json()
    assert body2["synced_workout_count"] == 0  # already synced


def test_workouts_sync_triggers_promotion(client):
    """Send a perfect workout (all sets at target) and verify a promotion fires."""
    # Use a separate user context: clear cookies don't work with bearer, so we
    # just place+sync again with a different node.
    client.post(
        "/api/v1/onboarding/place",
        json={
            "answers": {
                "can_pull_up": True,
                "support_hold_15s": True,
                "active_hang_10s": False,
                "rir2_pushup_reps": 8,
            }
        },
        headers={"Authorization": f"Bearer {BEARER_TOKEN}"},
    )
    r = client.get(
        "/api/v1/users/me/progressions",
        headers={"Authorization": f"Bearer {BEARER_TOKEN}"},
    )
    pull_prog = next(
        p
        for p in r.json()["active_progressions"]
        if "Pull" in p["tree_name"]
    )
    node_id = pull_prog["current_node"]["node_id"]
    target_hold = pull_prog["current_node"]["target_hold_secs"]

    payload = {
        "sync_client_timestamp": "2026-06-25T13:00:00Z",
        "workouts": [
            {
                "client_workout_id": f"promote-{node_id}",
                "completed_at": "2026-06-25T12:00:00Z",
                "logs": [
                    {
                        "node_id": node_id,
                        "sets": [
                            {"set_number": 1, "hold_secs": target_hold + 5, "reps": None},
                            {"set_number": 2, "hold_secs": target_hold + 3, "reps": None},
                            {"set_number": 3, "hold_secs": target_hold + 1, "reps": None},
                        ],
                    }
                ],
            }
        ],
    }
    r = client.post(
        "/api/v1/workouts/sync",
        json=payload,
        headers={"Authorization": f"Bearer {BEARER_TOKEN}"},
    )
    assert r.status_code == 201
    body = r.json()
    assert len(body["state_updates"]["promotions"]) == 1
    promo = body["state_updates"]["promotions"][0]
    assert promo["old_node_id"] == node_id
    assert promo["new_node_id"] != node_id
    assert promo["trigger"] == "PROMOTION"


def test_workouts_sync_triggers_regression(client):
    """Send a workout with a critically-failed set and verify a regression fires."""
    client.post(
        "/api/v1/onboarding/place",
        json={
            "answers": {
                "can_pull_up": True,
                "support_hold_15s": True,
                "active_hang_10s": False,
                "rir2_pushup_reps": 8,
            }
        },
        headers={"Authorization": f"Bearer {BEARER_TOKEN}"},
    )
    r = client.get(
        "/api/v1/users/me/progressions",
        headers={"Authorization": f"Bearer {BEARER_TOKEN}"},
    )
    pull_prog = next(
        p
        for p in r.json()["active_progressions"]
        if "Pull" in p["tree_name"]
    )
    node_id = pull_prog["current_node"]["node_id"]

    # 3 sets where set 3 holds only 4s — well below the 8s threshold
    payload = {
        "sync_client_timestamp": "2026-06-25T14:00:00Z",
        "workouts": [
            {
                "client_workout_id": f"regress-{node_id}-{__import__('uuid').uuid4()}",
                "completed_at": "2026-06-25T13:00:00Z",
                "logs": [
                    {
                        "node_id": node_id,
                        "sets": [
                            {"set_number": 1, "hold_secs": 15, "reps": None},
                            {"set_number": 2, "hold_secs": 12, "reps": None},
                            {"set_number": 3, "hold_secs": 4, "reps": None},
                        ],
                    }
                ],
            }
        ],
    }
    r = client.post(
        "/api/v1/workouts/sync",
        json=payload,
        headers={"Authorization": f"Bearer {BEARER_TOKEN}"},
    )
    assert r.status_code == 201
    body = r.json()
    assert len(body["state_updates"]["regressions"]) == 1
    reg = body["state_updates"]["regressions"][0]
    assert reg["old_node_id"] == node_id
    assert reg["new_node_id"] != node_id
    assert reg["trigger"] == "CRITICAL_FAIL"
    assert "4" in reg["reason"]


def test_openapi_spec_published(client):
    r = client.get("/openapi.json")
    assert r.status_code == 200
    spec = r.json()
    assert "/api/v1/users/me/progressions" in spec["paths"]
    assert "/api/v1/workouts/sync" in spec["paths"]
    assert "/api/v1/onboarding/place" in spec["paths"]


# -----------------------------------------------------------------------------#
# GET /api/v1/users/me/history
# -----------------------------------------------------------------------------#


def test_history_requires_auth(client):
    r = client.get("/api/v1/users/me/history")
    assert r.status_code == 401


def test_history_empty_for_fresh_user(client):
    """No workouts logged yet → recent=[], total_workouts=0, streak_days=0."""
    # Make sure we're past onboarding first (clear any prior placement).
    # Then read history directly. Even without placement, history is just "empty".
    r = client.get(
        "/api/v1/users/me/history",
        headers={"Authorization": f"Bearer {BEARER_TOKEN}"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["recent"] == []
    assert body["total_workouts"] == 0
    assert body["streak_days"] == 0


def test_history_after_one_workout(client):
    """Log one workout, then history returns 1 row with the right shape."""
    headers = {"Authorization": f"Bearer {BEARER_TOKEN}"}

    # Place + grab a node_id
    client.post(
        "/api/v1/onboarding/place",
        json={
            "answers": {
                "can_pull_up": True,
                "support_hold_15s": True,
                "active_hang_10s": False,
                "rir2_pushup_reps": 8,
            }
        },
        headers=headers,
    )
    r = client.get("/api/v1/users/me/progressions", headers=headers)
    body = r.json()
    pull_prog = next(p for p in body["active_progressions"] if "Pull" in p["tree_name"])
    node_id = pull_prog["current_node"]["node_id"]

    # Log 1 workout on that node
    sync_r = client.post(
        "/api/v1/workouts/sync",
        json={
            "sync_client_timestamp": "2026-06-25T12:00:00Z",
            "workouts": [
                {
                    "client_workout_id": "history-test-wk-1",
                    "completed_at": "2026-06-25T11:30:00Z",
                    "logs": [
                        {
                            "node_id": node_id,
                            "sets": [
                                {"set_number": 1, "hold_secs": 15, "reps": None},
                                {"set_number": 2, "hold_secs": 12, "reps": None},
                            ],
                        }
                    ],
                }
            ],
        },
        headers=headers,
    )
    assert sync_r.status_code == 201

    r = client.get("/api/v1/users/me/history", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert body["total_workouts"] == 1
    # 2 sets logged => 2 rows (one HistoryRow per set_log in the join)
    assert len(body["recent"]) == 2
    row = body["recent"][0]
    # Wire-format checks
    assert row["id"]  # non-empty
    assert row["exercise_name"]
    assert row["tree_id"].startswith("tree_")
    assert row["tree_name"]
    assert row["node_id"].startswith("node_")
    assert row["sets_completed"] == 1
    assert row["sets_target"] >= 1
    assert isinstance(row["is_promotion"], bool)
    assert "logged_at" in row
    # Streak: workout was today-ish, so >= 1
    assert body["streak_days"] >= 1


def test_history_isolated_per_user(client):
    """Each user sees only their own workouts."""
    h1 = {"Authorization": f"Bearer {BEARER_TOKEN}"}

    # User 1: place + log a workout
    client.post(
        "/api/v1/onboarding/place",
        json={
            "answers": {
                "can_pull_up": True,
                "support_hold_15s": True,
                "active_hang_10s": False,
                "rir2_pushup_reps": 8,
            }
        },
        headers=h1,
    )
    r = client.get("/api/v1/users/me/progressions", headers=h1)
    body = r.json()
    pull_prog = next(p for p in body["active_progressions"] if "Pull" in p["tree_name"])
    node_id = pull_prog["current_node"]["node_id"]

    client.post(
        "/api/v1/workouts/sync",
        json={
            "sync_client_timestamp": "2026-06-25T13:00:00Z",
            "workouts": [
                {
                    "client_workout_id": "history-isolation-wk-1",
                    "completed_at": "2026-06-25T12:00:00Z",
                    "logs": [
                        {
                            "node_id": node_id,
                            "sets": [
                                {"set_number": 1, "hold_secs": 15, "reps": None},
                            ],
                        }
                    ],
                }
            ],
        },
        headers=h1,
    )
    r1 = client.get("/api/v1/users/me/history", headers=h1)
    assert r1.status_code == 200
    user1_count = r1.json()["total_workouts"]
    assert user1_count == 1

    # User 2: separate bearer (from BEARER_TOKEN2, falls back to BEARER_TOKEN if absent —
    # which means we can't truly isolate users with this test fixture; flag it instead).
    bearer2 = os.environ.get("BEARER_TOKEN2", BEARER_TOKEN)
    if bearer2 == BEARER_TOKEN:
        pytest.skip("No BEARER_TOKEN2 set; cannot test cross-user isolation in this env")
    h2 = {"Authorization": f"Bearer {bearer2}"}
    r2 = client.get("/api/v1/users/me/history", headers=h2)
    assert r2.status_code == 200
    # User 2 has no workouts of their own
    assert r2.json()["total_workouts"] == 0
    assert "/healthz" in spec["paths"]
