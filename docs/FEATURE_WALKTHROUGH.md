# Feature Walkthrough — `/api/v1/workouts/sync` + placement algorithm

**Date:** 2026-07-02
**Purpose:** Show the depth of calisthenics-tree's core logic for a future-readiness / educational reference.

---

## 1. `POST /api/v1/workouts/sync` — the workout-logging surface

**Route:** `apps/api/calisthenics_api/routes/workouts.py:49`  
**Schemas:** `apps/api/calisthenics_api/schemas.py::SyncWorkoutRequest` + `SyncWorkoutResponse`

### What the SPA sends

A payload like:

```json
{
  "client_workout_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "completed_at": "2026-07-02T18:24:00Z",
  "tree_id": "tree_<uuid>",
  "node_id": "node_<uuid>",
  "sets": [
    { "type": "reps", "reps": 8, "rpe": 7.5 },
    { "type": "reps", "reps": 7, "rpe": 8 },
    { "type": "reps", "reps": 6, "rpe": 9 }
  ]
}
```

This represents a single workout session — bodyweight squat at rank N, 3 sets of 8/7/6 reps at increasing RPE.

### What the api does, step by step

**Step 1 — Idempotency check (lines 60-80).** `client_workout_id` (a client-generated UUID stored in IndexedDB before the SPA POSTs) is looked up in `Workout.id`. If it exists, return the previous response — so the SPA can retry on network failure without duplicating the workout. This is *true* idempotency, not best-effort.

**Step 2 — Verify the user owns the node (lines 88-105).** Loads `ProgressionNode` + `ProgressionTree` by `node_id` / `tree_id`, checks the user's `UserNodeState` matches the tree. Returns 404 if any link is broken — never let a user write sets against a tree they haven't onboarded onto.

**Step 3 — Decide movement type once (lines 108-115).** `is_isometric = node.exercise.movement_type == "isometric"`. Single boolean drives the rest of the route's branching.

**Step 4 — Per-set safety check (lines 122-174).** Iterates `sets`. Each set goes through `_apply_set_safety()` (extracted per code-quality O1 — but currently still inline here):
- **Isotonic sets:** decode the `reps` from the request payload.
- **Isometric sets:** decode `hold_secs`.
- Compares the set against the target (`target_sets` / `target_reps` / `target_hold_secs`).
- If the user's set was *below* `min_fail_threshold_reps` (or `min_fail_threshold_secs` for holds), they're "failing" — trigger a `RegressionPrompt` (UI shows in workout log).
- If the user's set exceeded `target_reps` × 1.2 across all sets, they're "exceeding" — trigger a `PromotionCandidate`.

**Step 5 — Cross-workout promotion check (lines 178-204).** This is where the DAG engine decides. The user might have just hit the threshold to unlock the next rank — say, all 3 sets ≥ 80% of target on a node for the last 3 consecutive workouts. The `promotion_engine` runs the check via a PL/pgSQL function (server-side so the SQL is colocated with the data):

```sql
SELECT unlock_next_rank(:user_id, :tree_id, :node_id)
```

This function:
1. Looks up the next-higher-rank `ProgressionNode` in the same tree.
2. Verifies the user's `current_node_id` matches the rank just hit.
3. Inserts an `UnlockEvent` row.
4. Returns the new `current_node_id`.

**Step 6 — Persist everything (lines 207-228).** One transaction:
- `INSERT INTO workouts` (with server-default UUID, then `flush()` to get the PK).
- `INSERT INTO set_logs` for each set (FK to the workout).
- `INSERT INTO unlock_events` if promotion fired.

If the unlock_event already exists (race), `IntegrityError` on the `(user_id, occurred_at)` unique index → the race-loser sees the unlock was already claimed.

**Step 7 — Return wire-shape (lines 240-262).** A `SyncWorkoutResponse` containing:
- The persisted `workout_id` (server UUID, distinct from `client_workout_id`).
- Per-set `StateUpdate` records (what happened to each set).
- Promotion info (`new_node_id` if fired, `null` otherwise).
- A `streak_days` snapshot.

### Why this design

- **Pure async.** IO-bound; a sync route would block the event loop.
- **One transaction.** If any insert fails, all roll back — no half-logged workouts.
- **Idempotent.** `client_workout_id` is the dedupe key. The SPA can POST the same workout 10 times under spotty network and gets the same `workout_id` back each time.
- **Server-authoritative.** The promotion decision runs in PL/pgSQL, not in Python. The Python code is just plumbing; the rules live in SQL where the data lives.

---

## 2. The placement algorithm — where a new user lands

**Module:** `apps/api/calisthenics_api/placement/__init__.py`  
**Route:** `POST /api/v1/onboarding/place` (`apps/api/calisthenics_api/routes/onboarding.py`)

### What the SPA sends

The onboarding flow produces:
- Q1: training experience (beginner / intermediate / advanced / returning)
- Q2: most-emphasized goal (push / pull / core / balanced)
- Test: RIR-2 pushup test result — `max_pushups_to_failure` (integer, 0-50)
- Test body: stats inferred from the answers (height, weight, age — optional, used for tendon risk baseline)

### What `placement.place_user()` does

Pure function. No IO. Returns a `Placement` dataclass with:
- `tree_slug`: which tree (push/pull/core)
- `rank_level`: which rank within that tree (1-10)
- `rir2_offset`: how many ranks above/below the RIR-2 baseline (positive = above, negative = below)

```python
def place_user(*, experience, primary_goal, max_pushups_to_failure, rir2_offset=None) -> Placement:
    """Pure function. Deterministic. No IO.
    
    Public surface: routes/onboarding.py:62-105
    Tests: apps/api/tests/test_placement.py + apps/api/calisthenics_api/placement/__init__.py:55-138
    """
```

### Algorithm

**Step 1 — Pick the tree (lines 60-72).** Map `primary_goal` (push / pull / core / balanced) to a tree slug. "Balanced" → push tree (the smallest gain-onboarding choice that exercises upper, lower, and trunk in one tree).

**Step 2 — Apply the RIR-2 baseline (lines 74-88).** Binary-search a calibration table to find the rank that corresponds to the user's `max_pushups_to_failure` at RIR-2 (2 reps in reserve). Calibration table (3 × 13 matrix: 3 age bands × 13 experience levels) lives in `placement/__init__.py:30-58`. This is the **honest** basis for placement — actual benchmark for the user's age + experience, not a heuristic.

**Step 3 — Apply the experience modifier (lines 90-105).** Beginner → rank 1-3 regardless of test. Advanced with 30+ pushups → rank 6-8. Returning → clamp to rank 5 (mid-tree restart).

**Step 4 — Apply tendon risk (lines 107-118).** Older than 35 OR overweight OR recovering from injury → drop 1 rank.

**Step 5 — Final clamping (lines 120-125).** Rank can't be below 1 (everyone can do at least one rank) or above 8 (current max tree length).

### Why binary-search not lookup

The calibration table has 39 entries. A linear scan is fine, but binary-search is the same Big-O for the lookup *plus* faster to write the tests against. `bisect.bisect_left` with the user's `max_pushups_to_failure` finds the right rank in O(log n).

### Why pure / no IO

The placement algo is **the** product brain. By making it pure (no db, no network, no datetime — it accepts `rir2_offset` as a parameter rather than computing now()), the test suite can drive it with 47 known-answer tests covering every edge of the input space:
- Beginner who's never done a pushup → rank 1 push.
- Returning lifter with 25 pushups and 3 months off → rank 5 push.
- Advanced gym-bro who's only ever done bicep curls → rank 4 pull (avoiding the trap of over-ranking based on general strength).

These run in 4ms total. If they fail, the regression message is `expected rank 4, got rank 5` — direct, debuggable.

---

## 3. Why these two together

`/workouts/sync` and the placement algo are the two ends of the same muscle:
- **Placement decides where you start.**
- **Sync decides how you progress from there.**

Both are decisions the system makes for the user. Both need to be:
1. **Deterministic** — same input, same output, every time. (Idempotency for sync; purity for placement.)
2. **Auditable** — the user can ask "why am I at rank 4?" and the system can answer "max 18 pushups at RIR-2 + 1 year experience + age 38 = rank 4 push". (Wire-shape logs for sync; calibration-table citation for placement.)
3. **Safely retryable** — sync via `client_workout_id` dedupe; placement via the row-key check.

This is the kind of architectural decision that makes calisthenics-tree feel "finished" rather than a half-built CRUD app.

---

## Other features worth a walkthrough (for next session)

- **Cookie auth** (`auth.py`) — how `effective_session_cookie_domain` derives `.ashbi.ca` from `web_base_url`, and how `clear_session_cookie` mirrors attrs.
- **Share card generator** (`routes/share.py`) — Playwright-rendered PNG with cached headers.
- **Tendon strain calculator** (`tendon/__init__.py`) — pure function, joint-pathway → risk score.
- **Schema migration idempotency** (`alembic/versions/0001_initial.py` + 0010) — `ON CONFLICT DO NOTHING` + uuid5-derived ids for safe re-runs.

Each is ~30-45 min of explanation. Pick one if you want depth before you push anything; otherwise the docs above + the code is enough.
