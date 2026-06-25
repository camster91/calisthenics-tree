# Calisthenics Tree — Architecture

> Phase 1 backend (Postgres + FastAPI) with a React/Vite web client. This doc
> orients a new contributor in ~30 minutes.

---

## 1. System overview

Calisthenics Tree is an offline-first calisthenics progression platform. The
core data model is a **directed acyclic graph of skill nodes** grouped into
"trees" (Push, Pull, Core). Each user has one *current node* per tree; their
state advances when they log workouts that meet the node's target reps / hold
time, or regresses when a set falls below the critical-fail threshold.

The system is split into three tiers:

1. **Web client** — React 19 + Vite + Tailwind v4 SPA. Talks to the API over
   fetch with a bearer token. Vite dev-server proxies `/api/*` to the FastAPI
   container, so the same `VITE_API_URL=/api` works locally and in prod.
2. **API** — FastAPI on Python 3.12, async SQLAlchemy 2.0 with `asyncpg`,
   Pydantic v2 schemas, Alembic migrations. All progression logic is pure
   Python (placement, tendon strain); the only piece that runs in the
   database is the `check_node_unlock_status` PL/pgSQL function, which
   evaluates promotion eligibility atomically.
3. **Database** — Postgres 16. Schema is a full DAG (`progression_nodes` +
   `progression_edges` junction table) with workouts, set logs, per-user
   state, and a tendon-strain time-series table. Seeded with three trees of
   ten nodes each.

```
+--------------------+        bearer token        +-----------------------+
|     apps/web       |  <----------------------->  |     apps/api          |
|  React 19 + Vite   |   /api/v1/* (JSON, REST)    |   FastAPI (uvicorn)   |
|  Tailwind v4       |                             |   SQLAlchemy 2 async  |
|  Design tokens     |                             |   Pydantic v2         |
+--------------------+                             |   Alembic migrations  |
        |                                          +-----------------------+
        | /share/* deep-link renders                        |
        v                                                 v
   (browser static)                              +-----------------------+
                                                 |   Postgres 16         |
                                                 |   pgcrypto            |
                                                 |   PL/pgSQL:           |
                                                 |   check_node_unlock_  |
                                                 |   status(user, node)  |
                                                 +-----------------------+
```

Hosting target (per `docs/PLAN.md`): Coolify on the Ashbi VPS. Three Coolify
projects — `calisthenicstree-web`, `calisthenicstree-api`,
`calisthenicstree-db` — wired together via Docker networking. SSL terminates
at Caddy; Cloudflare fronts the domain.

---

## 2. Backend module layout

All backend code lives under `apps/api/calisthenics_api/`.

| Module | Purpose |
|---|---|
| `__init__.py` | Package marker; exposes `__version__ = "0.1.0"`. |
| `main.py` | FastAPI app factory. Mounts `/healthz` at root, all other routers under `settings.api_v1_prefix`. Wires the async-context-manager `lifespan` to log startup/shutdown and dispose the SQLAlchemy engine. |
| `config.py` | `Settings` (Pydantic v2) loaded from environment / `.env`. Holds `database_url`, `bearer_token`, `environment`, `api_v1_prefix`. `@lru_cache` `get_settings()` is the single accessor. |
| `auth.py` | `get_current_user` FastAPI dependency. Bearer-token check against `settings.bearer_token`; on a valid token, upserts a `User` row with a stable UUID (`uuid5(NAMESPACE_DNS, "calisthenics:<token>")`) so re-runs don't fragment data. Returns an `AuthContext` frozen Pydantic model. |
| `db/__init__.py` | Async SQLAlchemy engine + `async_sessionmaker`. `get_session()` is the FastAPI dependency: yields a session, commits on success, rolls back on exception, then closes. |
| `db/models.py` | All eight SQLAlchemy 2.0 ORM models (`User`, `Exercise`, `ProgressionTree`, `ProgressionNode`, `ProgressionEdge`, `Workout`, `SetLog`, `UserNodeState`, `TendonStrainScore`) plus the `MovementType`, `EdgeType`, `JointPathway` string-constant classes that mirror the Postgres ENUMs. |
| `routes/health.py` | `GET /healthz` — liveness probe, no auth, returns `{status, version, environment}`. |
| `routes/onboarding.py` | `POST /api/v1/onboarding/place` — runs placement algorithm for every tree, upserts a `UserNodeState` row per tree, returns the per-tree starting nodes + the resolved archetype + RIR-2 offset. |
| `routes/progressions.py` | `GET /api/v1/users/me/progressions` — returns the user's current node in every tree they have state for, joined to exercise + tree metadata. |
| `routes/workouts.py` | `POST /api/v1/workouts/sync` — batch-sync endpoint for offline-logged workouts. Idempotent on `client_workout_id`. Per workout: insert `Workout` + `SetLog` rows, run per-set safety check (critical-fail → regression), then call the PL/pgSQL promotion function per node touched. Returns aggregated `promotions` / `regressions` `state_updates`. |
| `placement/__init__.py` | Pure functions for placement: `assess_archetype(answers)` (3-question binary tree), `rir2_placement(rep_count)` (sub-maximal proxy), `place_user(archetype, reps, nodes_by_rank)`. No I/O. Constants: `ARCHETYPE_BASELINE_RANK`. |
| `tendon/__init__.py` | Pure functions for tendon-strain calc: `calc_strain(sets)`, `rolling_4wk_average(pathway, history, now)`, `find_deload_alerts(current_strain, history_by_pathway)`, `pick_regression(...)`. Constants: `DELOAD_RATIO = 1.50`, `ROLLING_WINDOW_DAYS = 28`. |
| `schemas.py` | Pydantic v2 wire models mirroring `db/models.py`. Includes ID-prefix helpers (`user_id`, `tree_id`, `node_id`) that convert raw UUIDs to the spec's `usr_*`, `tree_*`, `node_*` wire format. |

Other backend files outside the package:

| Path | Purpose |
|---|---|
| `apps/api/alembic.ini` | Alembic config; DSN points at `localhost:5433` for local dev. |
| `apps/api/alembic/versions/0001_initial.py` | The only migration. Creates all 8 tables, the PL/pgSQL `check_node_unlock_status` function, and seeds 3 trees × 10 nodes + edges. |
| `apps/api/Dockerfile` | API container build. |
| `apps/api/tests/` | `test_placement.py`, `test_tendon.py`, `test_promotion_function.py`, `test_api_routes.py` (asyncio mode auto). |
| `docker-compose.yml` | Two services: `db` (postgres:16-alpine, port 5433 → 5432) and `api` (built from `apps/api/Dockerfile`, port 8000). |

---

## 3. Database schema

Eight tables. All PKs are `UUID` with `DEFAULT gen_random_uuid()` (requires
`pgcrypto`). Times are `timestamptz`. Postgres ENUMs are encoded as `CHECK`
constraints on free-form `String` columns (not native ENUM types) so adding
new values doesn't require a migration.

```sql
-- USERS ----------------------------------------------------------------
users
  id              UUID          PK, default gen_random_uuid()
  email           VARCHAR(255)  UNIQUE NOT NULL
  created_at      TIMESTAMPTZ   NOT NULL, default now()

-- EXERCISES ------------------------------------------------------------
exercises
  id                UUID          PK, default gen_random_uuid()
  name              VARCHAR(255)  NOT NULL
  movement_type     VARCHAR(50)   NOT NULL   -- CHECK IN ('isometric','isotonic')
  primary_muscles   TEXT[]        NOT NULL
  secondary_muscles TEXT[]        NOT NULL   -- default '{}'
  video_url         TEXT          NOT NULL
  created_at        TIMESTAMPTZ   NOT NULL, default now()

-- PROGRESSION TREES (DAG containers) -----------------------------------
progression_trees
  id          UUID          PK
  name        VARCHAR(255)  NOT NULL
  description TEXT          NULL
  slug        VARCHAR(100)  UNIQUE NOT NULL

-- PROGRESSION NODES (one skill step inside a tree) --------------------
progression_nodes
  id                       UUID     PK
  tree_id                  UUID     FK progression_trees(id) ON DELETE CASCADE
  exercise_id              UUID     FK exercises(id)        ON DELETE CASCADE
  rank_level               INT      NOT NULL              -- 1..N within a tree
  target_sets              INT      NOT NULL, default 3
  target_reps              INT      NULL                  -- one of reps/hold required
  target_hold_secs         INT      NULL
  min_fail_threshold_reps  INT      NULL                  -- critical-fail floor
  min_fail_threshold_secs  INT      NULL
  joint_pathways           TEXT[]   NOT NULL, default '{}'  -- tendon calc
  intensity_factor         FLOAT    NOT NULL, default 1.0   -- 1.8 for straight-arm

  CONSTRAINT uq_progression_nodes_tree_exercise UNIQUE (tree_id, exercise_id)
  INDEX ix_progression_nodes_tree_rank (tree_id, rank_level)

-- PROGRESSION EDGES (DAG edges — junction, not single pointers) -------
progression_edges
  id           UUID         PK
  from_node_id UUID         FK progression_nodes(id) ON DELETE CASCADE
  to_node_id   UUID         FK progression_nodes(id) ON DELETE CASCADE
  edge_type    VARCHAR(20)  NOT NULL -- CHECK IN ('progression','regression','lateral')
  priority     INT          NULL     -- lower = preferred for on-the-fly picks

  CONSTRAINT uq_progression_edges_triple UNIQUE (from_node_id, to_node_id, edge_type)
  INDEX ix_progression_edges_from (from_node_id, edge_type)

-- WORKOUTS (one training session) --------------------------------------
workouts
  id                 UUID         PK
  user_id            UUID         FK users(id) ON DELETE CASCADE
  completed_at       TIMESTAMPTZ  NOT NULL, default now()
  client_workout_id  VARCHAR(255) NULL   -- idempotency key from offline sync

  INDEX ix_workouts_user_completed (user_id, completed_at)
  INDEX ix_workouts_client_workout_id (client_workout_id)

-- SET LOGS (one performed set) ----------------------------------------
set_logs
  id          UUID        PK
  workout_id  UUID        FK workouts(id) ON DELETE CASCADE
  node_id     UUID        FK progression_nodes(id) ON DELETE CASCADE
  set_number  INT         NOT NULL      -- 1-indexed within the exercise
  reps        INT         NULL
  hold_secs   INT         NULL
  created_at  TIMESTAMPTZ NOT NULL, default now()

  INDEX ix_set_logs_workout_node (workout_id, node_id)

-- USER NODE STATE (where the user currently sits per tree) ------------
user_node_state
  id              UUID        PK
  user_id         UUID        FK users(id)               ON DELETE CASCADE
  tree_id         UUID        FK progression_trees(id)   ON DELETE CASCADE
  current_node_id UUID        FK progression_nodes(id)   ON DELETE CASCADE
  unlocked_at     TIMESTAMPTZ NOT NULL, default now()

  CONSTRAINT uq_user_node_state_user_tree UNIQUE (user_id, tree_id)

-- TENDON STRAIN TIME-SERIES -------------------------------------------
tendon_strain_scores
  id             UUID        PK
  user_id        UUID        FK users(id) ON DELETE CASCADE
  joint_pathway  VARCHAR(50) NOT NULL
  score          FLOAT       NOT NULL
  recorded_at    TIMESTAMPTZ NOT NULL, default now()

  INDEX ix_tendon_user_pathway_time (user_id, joint_pathway, recorded_at)
```

### Database-side functions

| Function | Returns | Purpose |
|---|---|---|
| `check_node_unlock_status(p_user_id UUID, p_node_id UUID)` | table `(is_unlocked BOOL, next_node_id UUID, required_sets INT, completed_sets INT, metrics_summary JSONB)` | Atomic promotion check. Joins `progression_nodes` + `exercises`, picks the highest-priority progression edge as `next_node`, finds the user's most recent workout containing this node, evaluates up to `target_sets` working sets, and decides `is_unlocked` based on `movement_type`. |

### Seeded data (`0001_initial.py`)

Three trees, each with 10 nodes (rank 1..10) and stable UUIDs derived via
`uuid5(NAMESPACE_DNS, ...)`:

| Slug | Name | Path |
|---|---|---|
| `push_handstand_pushup_path` | Vertical Push (Handstand Push-Up Path) | Wall Push-Up → Incline → Standard → Diamond → Pike → Wall HS Hold → Wall HS Push-Up → Freestanding HS Hold → Freestanding HS Push-Up → Planche Push-Up (Rings) |
| `pull_front_lever_path` | Horizontal Pull (Front Lever Path) | Dead Hang → Active Hang → Scapular Pulls → Negative Pull-Up → Pull-Up → Tuck FL Hold → Adv Tuck FL Hold → Straddle FL Hold → Full FL Hold → Front Lever Pull |
| `core_dragon_flag_path` | Core (Dragon Flag Path) | Plank → Side Plank → Hollow Hold → L-Sit Floor → L-Sit Bars → Toes-to-Bar → Tuck Dragon Flag → Adv Tuck Dragon Flag → Straddle Dragon Flag → Full Dragon Flag |

Edges wired by the migration: linear `progression` from rank N → N+1 for
all three trees; one `regression` edge on Push (rank 8 → 6), two
`regression` edges with priorities 1/2 on Pull (rank 6 → ranks 1, 2), two
`regression` edges with priorities 1/2 on Core (rank 6 → ranks 5, 4), and
one `lateral` edge on Pull (rank 8 → 7).

---

## 4. API surface

Base prefix: `/api/v1` (configurable via `API_V1_PREFIX`). `GET /healthz` is
unprefixed. Every other route requires `Authorization: Bearer <token>` from
`BEARER_TOKEN`. Wire-format IDs are prefixed (`usr_`, `tree_`, `node_`); the
prefix is added at the response edge in `schemas.py`.

| Method | Path | Auth | Purpose | Request | Response (200/201) |
|---|---|---|---|---|---|
| GET | `/healthz` | none | Liveness probe; used by UptimeRobot. | — | `{status: "ok", version, environment}` |
| POST | `/api/v1/onboarding/place` | bearer | Place the user at a starting node in every tree based on the 3 archetype questions + RIR-2 pushup test. Upserts `user_node_state` per tree. | `{answers: {can_pull_up: bool, support_hold_15s?: bool, active_hang_10s?: bool, rir2_pushup_reps: int}}` | `{archetype: "beginner"\|"novice_a"\|"novice_b"\|"intermediate", rir2_offset: -2\|0\|1, placements: [{tree_id, tree_name, starting_node_id, starting_node_name, starting_rank}, ...]}` |
| GET | `/api/v1/users/me/progressions` | bearer | Return the user's current node + target specs for every tree they have state in. Called on every app load to render the home screen. | — | `{user_id, updated_at, active_progressions: [{tree_id, tree_name, current_node: {node_id, exercise_name, movement_type, target_sets, target_reps?, target_hold_secs?}}, ...]}` |
| POST | `/api/v1/workouts/sync` | bearer | Batch-sync offline-logged workouts. Idempotent on `client_workout_id`. Inserts `Workout` + `SetLog` rows, runs per-set safety check, then calls `check_node_unlock_status` per touched node. Returns aggregated state changes. Status `201 Created`. | `{sync_client_timestamp: ISO8601, workouts: [{client_workout_id, completed_at, logs: [{node_id, sets: [{set_number, reps?, hold_secs?}, ...]}, ...]}, ...]}` | `{status: "success", synced_workout_count: int, state_updates: {promotions: [{tree_id, old_node_id, new_node_id, trigger: "PROMOTION", reason}], regressions: [{tree_id, old_node_id, new_node_id, trigger: "CRITICAL_FAIL", reason}]}}` |

### Error responses

| Status | Where | Body |
|---|---|---|
| 401 | Any route except `/healthz`, missing or wrong bearer token | `{detail: "Missing bearer token"\|"Invalid bearer token"}` with `WWW-Authenticate: Bearer` |
| 422 | Any Pydantic-validated route, schema violation | FastAPI default `{detail: [{loc, msg, type}, ...]}` |
| 500 | `/api/v1/onboarding/place` if a seed tree has rank gaps | ValueError surfaced from `place_user` (contiguity check) |

---

## 5. Key algorithms

### Placement (binary-search + RIR-2)

Lives in `apps/api/calisthenics_api/placement/__init__.py`. Pure functions,
no I/O.

**Step 1 — Archetype (3-question binary tree).** `assess_archetype(answers)`
walks the spec's binary tree:

```
        Q1: can_pull_up?
        /          \
      Yes           No
      /              \
Q2: support_hold_15s?   Q3: active_hang_10s?
    /       \               /       \
  Yes       No            Yes        No
   |         |              |          |
Intermediate Novice B    Novice A   Beginner
```

**Step 2 — RIR-2 sub-maximal proxy.** `rir2_placement(rep_count)` maps raw
pushup reps at RIR-2 to an integer offset: `<5 → -2`, `5..12 → 0`, `>12 →
+1`. Negative input raises `ValueError`.

**Step 3 — Resolve to a real node.** `place_user(archetype, rir2_reps,
nodes_by_rank)` looks up the archetype's baseline rank
(`ARCHETYPE_BASELINE_RANK = {beginner: 1, novice_a: 2, novice_b: 3,
intermediate: 4}`), adds the RIR-2 offset, then **clamps** to the existing
rank range so off-the-end offsets land on the nearest available node. It
also verifies that `nodes_by_rank` is contiguous from `min..max` and raises
`ValueError` if not — that's a seed-data bug, not a runtime condition.

The caller (`routes/onboarding.py`) fetches every tree, builds
`{rank_level: node_id}` for each, calls `place_user` per tree, and upserts
a `UserNodeState` row keyed on `(user_id, tree_id)`.

### Promotion (PL/pgSQL — `check_node_unlock_status`)

Lives in `apps/api/alembic/versions/0001_initial.py` as a `CREATE OR REPLACE
FUNCTION`. Runs *inside* Postgres during `/api/v1/workouts/sync`.

For `(p_user_id, p_node_id)`:

1. Read the node's `target_sets`, `target_reps` / `target_hold_secs`, and
   `movement_type` (joined via `exercises`).
2. Pick `next_node` = the highest-priority `progression` edge from this
   node (lowest non-null `priority`, ties broken by insertion order).
3. Find the user's most recent workout containing a set on this node.
4. Take the first `target_sets` rows from that workout's `set_logs` for
   this node, ordered by `set_number`.
5. Compute `actual_sets`, `min_reps_achieved`, `min_hold_achieved`.
6. `is_unlocked = TRUE` iff:
   - `actual_sets >= target_sets`, **and**
   - `movement_type = 'isometric'` and `min_hold_achieved >= target_hold_secs`, **or**
   - `movement_type = 'isotonic'` and `min_reps_achieved >= target_reps`.

Returns the row to the API, which (if unlocked) calls `_set_current_node` to
upsert `user_node_state.current_node_id` and appends a `StateUpdate` of
`trigger: "PROMOTION"` to the response.

### Regression (Python — per-set safety check)

Also in `routes/workouts.py`. For every set in a synced workout:

- If `movement_type == "isometric"` and `hold_secs < min_fail_threshold_secs`,
  pick the highest-priority `regression` edge from this node, write
  `current_node_id = reg.to_node_id`, and append a `StateUpdate` of
  `trigger: "CRITICAL_FAIL"`. Break out of the per-log loop on first fail
  (one regression per node per workout).
- Same logic for `isotonic` against `min_fail_threshold_reps`.

### Tendon strain (rolling 4-week deload)

Lives in `apps/api/calisthenics_api/tendon/__init__.py`. Pure functions.

**Per-set score:** `IntensityFactor * DurationOrReps * RankLevel`.

- `IntensityFactor = 1.8` for straight-arm isometrics (planche, FL, HS),
  `1.0` otherwise.
- `DurationOrReps` = `hold_secs` (isometric) or `reps` (isotonic).
- `RankLevel` = the node's `rank_level` (1..10).

**Per-pathway total** (`calc_strain(sets)`): sum of per-set scores,
keyed by `joint_pathway`. Zero-rep / zero-sec sets are skipped.

**Deload alert** (`find_deload_alerts(...)`): for each pathway in
`current_strain`, compute `rolling_4wk_average(pathway, history, now)`
and flag if `current_score > 1.50 * rolling_avg`. A pathway with no
history is **never** flagged (no baseline yet, no false-positive deload).
The window is strictly `[now - 28d, now]`; future-dated entries are
dropped.

**Regression pick** (`pick_regression(...)`): if the deload fires, choose
the lowest non-null `priority` regression candidate originating from the
offending node. All-null priorities → first candidate wins.

---

## 6. Request lifecycle — "user logs a workout"

End-to-end, what happens when a user finishes a workout in the mobile / web
app and taps **Sync**:

```
[client]                                           [api]                                    [db]
   |                                                 |                                       |
   | (1) User completes a workout offline.           |                                       |
   |     App stores {client_workout_id,              |                                       |
   |     completed_at, logs[{node_id, sets[]}]}     |                                       |
   |     in IndexedDB / localStorage.               |                                       |
   |                                                 |                                       |
   | (2) Network available -> POST /api/v1/          |                                       |
   |     workouts/sync  (Authorization: Bearer X)    |                                       |
   |------------------------------------------------>|                                       |
   |                                                 |                                       |
   |                                                 | (3) auth.get_current_user             |
   |                                                 |     validates X, upserts User row,   |
   |                                                 |     returns AuthContext{user_id}.     |
   |                                                 |                                       |
   |                                                 | (4) Sort incoming workouts by         |
   |                                                 |     completed_at (defensive).         |
   |                                                 |                                       |
   |                                                 | for each workout wk:                  |
   |                                                 |                                       |
   |                                                 | (5) Idempotency check: SELECT 1       |
   |                                                 |     FROM workouts WHERE               |
   |                                                 |     user_id=? AND client_workout_id=? |
   |                                                 |---------------------------------------------------------->|
   |                                                 |                                       |
   |                                                 | (6) INSERT workout, flush.            |
   |                                                 |---------------------------------------------------------->|
   |                                                 |                                       |
   |                                                 | (7) Bulk-fetch progression_nodes      |
   |                                                 |     + exercises for every node_id     |
   |                                                 |     mentioned in wk.logs.             |
   |                                                 |---------------------------------------------------------->|
   |                                                 |                                       |
   |                                                 | (8) For each log, INSERT set_logs.    |
   |                                                 |---------------------------------------------------------->|
   |                                                 |                                       |
   |                                                 | (9) Per-set safety check:             |
   |                                                 |     if reps/hold < min_fail_threshold |
   |                                                 |       -> pick highest-priority        |
   |                                                 |          regression edge              |
   |                                                 |       -> _set_current_node(...)       |
   |                                                 |       -> append StateUpdate           |
   |                                                 |          trigger=CRITICAL_FAIL         |
   |                                                 |---------------------------------------------------------->|
   |                                                 |                                       |
   |                                                 | (10) For each non-regressed node,     |
   |                                                 |      call PL/pgSQL function:          |
   |                                                 |      SELECT * FROM                    |
   |                                                 |        check_node_unlock_status(      |
   |                                                 |          :user_id, :node_id)          |
   |                                                 |---------------------------------------------------------->|
   |                                                 |                                       |
   |                                                 | (11) If is_unlocked AND next_node_id, |
   |                                                 |      _set_current_node(...) and       |
   |                                                 |      append StateUpdate               |
   |                                                 |         trigger=PROMOTION.            |
   |                                                 |---------------------------------------------------------->|
   |                                                 |                                       |
   | (12) Response 201 Created:                       |                                       |
   |      {status, synced_workout_count,              |                                       |
   |       state_updates: {promotions, regressions}}  |                                       |
   |<------------------------------------------------|                                       |
   |                                                 |                                       |
   | (13) Client applies state_updates locally:      |                                       |
   |      - swap the affected node's "current" badge |                                       |
   |      - show "Nice — you unlocked X!" toast       |                                       |
   |      - on CRITICAL_FAIL, prompt "Swap to {Y}?"   |                                       |
   |                                                 |                                       |
   | (14) Next page load: GET /api/v1/users/me/      |                                       |
   |      progressions to refresh the home screen.   |                                       |
   |------------------------------------------------>|                                       |
```

The earlier part of the lifecycle — first launch:

```
[onboarding]
   (A) App collects Q1 (can_pull_up?), Q2/Q3 depending on Q1, and the RIR-2
       pushup test count.
   (B) POST /api/v1/onboarding/place with the four answers.
   (C) Server runs assess_archetype + rir2_placement + place_user per tree,
       upserts user_node_state per tree, returns {archetype, rir2_offset,
       placements}.
   (D) App stores the placements locally, renders the "Here's where you
       start" screen, navigates to the home DAG.
```

---

## 7. Frontend integration

The web client (`apps/web/`) is a Vite SPA. It talks to the API via the
typed client in `apps/web/src/lib/api.ts`.

### Vite dev-server proxy

`apps/web/vite.config.ts` runs the dev server on `0.0.0.0:5173`. The web
app builds URLs like `${API_BASE}/users/me/progressions`; in dev,
`API_BASE = import.meta.env.VITE_API_URL || '/api'`, so requests go to
`/api/*` on the same origin. Vite's default proxy is **not** configured in
`vite.config.ts` — instead, `docker-compose.yml` exposes the API at `:8000`
and the README documents an opt-in Vite proxy if you run the API outside
Docker. For production, the SPA is served by Caddy and a reverse proxy
routes `/api/*` to the API container over the internal Docker network.

### Bearer token

`apps/web/src/lib/api.ts` reads `VITE_API_TOKEN` from
`import.meta.env`. If unset, it falls back to the dev default
(`dev-bearer-token-replace-me`), which matches `BEARER_TOKEN` in
`docker-compose.yml`. Every request except `/healthz` sends
`Authorization: Bearer <token>`. Phase 2+ swaps this for a session-storage
JWT issued by Apple Sign-In / magic-link auth.

### Environment variables (web side)

| Var | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `/api` | Base path for all API requests. Override to point at a remote API in prod. |
| `VITE_API_TOKEN` | `dev-bearer-token-replace-me` | Bearer token sent on every non-`skipAuth` request. Phase 2+ replaces with real auth. |

### Typed client shape

`api.ts` exports typed response shapes that mirror `apps/api/calisthenics_api/schemas.py`
(`MovementType`, `Pathway`, `NodeState`, `ProgressionNode`, `ProgressionTree`,
`ActiveProgression`, `ProgressionsResponse`). The currently-shipped helpers
are:

- `getMyProgressions()` → `GET /users/me/progressions`
- `getHealth()` → `GET /healthz` (`skipAuth: true`)

Phase 2 adds `placeOnboarding(answers)` and `syncWorkouts(workouts)`
wrappers around the same `api<T>()` core; the contract is stable.

### Other frontend touch-points with the backend

- **Design tokens are generated, not edited.** `apps/web/src/tokens.ts` is
  the single source of truth; a Vite plugin
  (`apps/web/vite/plugin-theme.ts`) compiles it into
  `src/.generated/theme.css` at dev-server start and on token change.
  Tailwind v4 picks up the generated CSS — no Figma, no hand-edited CSS
  variables.
- **Share-card generator** (`scripts/render-share.ts` and
  `pages/ShareRenderPage.tsx`) renders an unlock to a PNG via headless
  Chrome, for the `/share/routine/<id>` deep-link pattern.
- **Wireframes** under `apps/web/src/pages/wireframes/` are Phase 1.5
  low-fi HTML mockups used for the Playwright vision-iteration loop; they
  don't ship.

---

## Where to read next

- `docs/PLAN.md` — competitive positioning, phased roadmap, locked
  decisions (hosting, pricing, kill criteria).
- `apps/api/calisthenics_api/placement/__init__.py` — placement algorithm
  reference.
- `apps/api/calisthenics_api/tendon/__init__.py` — tendon-strain reference.
- `apps/api/alembic/versions/0001_initial.py` — the schema and the PL/pgSQL
  promotion function in one place.
- `apps/api/tests/` — `test_placement.py` and `test_tendon.py` show
  the expected pure-function behavior; `test_promotion_function.py`
  exercises the SQL function; `test_api_routes.py` is the HTTP smoke test.
