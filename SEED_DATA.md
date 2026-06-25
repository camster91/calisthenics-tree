# Seed Data Inventory

> Source of truth: `apps/api/alembic/versions/0001_initial.py`
> Schema reference: `apps/api/calisthenics_api/db/models.py`
> Plan reference: `docs/PLAN.md` (Phase 1, line 100)

## 1. Overview

The Phase 1 migration seeds **3 progression trees × 10 nodes each = 30 skill nodes**, wired together by **33 progression edges** (27 forward + 5 regression + 1 lateral) stored in the `progression_edges` junction table.

The three trees cover the three movement axes a calisthenics practitioner trains:

| Tree | Slug | Skill arc |
|---|---|---|
| Vertical Push | `push_handstand_pushup_path` | Wall push-up → freestanding handstand push-up → planche push-up |
| Horizontal Pull | `pull_front_lever_path` | Dead hang → pull-up → full front lever → front lever pull |
| Core | `core_dragon_flag_path` | Plank → L-sit → full dragon flag |

**Design intent:**

- **Linear spine + selective branches.** Every tree is a strict 1→10 rank chain (9 forward progression edges per tree). The interesting structure sits on top of that: regressions for on-the-fly substitution when fatigue or injury hits, and lateral moves between parallel skills at the same rank family.
- **Two movement types per tree, with a hard inflection point.** Bent-arm / parallel loading dominates the lower ranks; ranks 5–6 transition to straight-arm isometric (handstand, front lever, dragon flag), which is where `intensity_factor` jumps from 1.0 → 1.8 to feed the tendon-strain calculator correctly.
- **Junction-table topology (not single pointers).** Per `docs/PLAN.md` line 18, the original source-doc design used one `progression_node_id` / one `regression_node_id` per node. That can't model "tuck FL regresses to advanced tuck FL *or* rings tuck FL *or* weighted tuck FL." The seed deliberately exercises this: Pull rank 6 (Tuck Front Lever Hold) has **two** regression edges with `priority` 1 and 2, so the regression engine picks the closer one first.
- **Deterministic UUIDs.** Tree / exercise / node IDs are generated via `uuid5(NAMESPACE_DNS, ...)` from stable string keys. This makes the seed idempotent (re-running the migration produces the same UUIDs) and lets tests reference rows by name instead of by captured UUID.

## 2. Tree Inventory

### 2.1 Vertical Push — `push_handstand_pushup_path`

**Description:** *From wall push-up to planche push-up. Builds toward a freestanding handstand push-up.*

| Rank | Exercise | Position | Movement | Target | Intensity | Joint pathways |
|---|---|---|---|---|---|---|
| 1 | Wall Push-Up | Entry | isotonic | 3 × 8 reps | 1.0 | bent-arm elbow, bent-arm shoulder |
| 2 | Incline Push-Up | Entry | isotonic | 3 × 8 reps | 1.0 | bent-arm elbow, bent-arm shoulder |
| 3 | Standard Push-Up | Mid | isotonic | 3 × 8 reps | 1.0 | bent-arm elbow, bent-arm shoulder |
| 4 | Diamond Push-Up | Mid | isotonic | 3 × 6 reps | 1.0 | bent-arm elbow, bent-arm shoulder |
| 5 | Pike Push-Up | Mid | isotonic | 3 × 6 reps | 1.0 | bent-arm elbow, bent-arm shoulder, wrist |
| 6 | Wall Handstand Hold | Advanced | isometric | 3 × 20 s hold | 1.0 | straight-arm shoulder, wrist |
| 7 | Wall Handstand Push-Up | Advanced | isotonic | 3 × 5 reps | 1.0 | straight-arm shoulder, wrist |
| 8 | Freestanding Handstand Hold | Advanced | isometric | 3 × 20 s hold | **1.8** | straight-arm shoulder, wrist |
| 9 | Freestanding Handstand Push-Up | Advanced | isotonic | 3 × 3 reps | **1.8** | straight-arm shoulder, wrist |
| 10 | Planche Push-Up (Rings) | Advanced | isotonic | 3 × 3 reps | **1.8** | straight-arm elbow, straight-arm shoulder, wrist |

**Inflection point:** rank 5 (Pike Push-Up) → rank 6 (Wall Handstand Hold). Loading shifts from bent-arm shoulder compression to straight-arm shoulder protraction; `wrist` enters the pathway set as a strain tracking target.

### 2.2 Horizontal Pull — `pull_front_lever_path`

**Description:** *From dead hang to front lever pull. Builds toward a full front lever.*

| Rank | Exercise | Position | Movement | Target | Intensity | Joint pathways |
|---|---|---|---|---|---|---|
| 1 | Dead Hang | Entry | isometric | 3 × 20 s hold | 1.0 | bent-arm shoulder, wrist |
| 2 | Active Hang | Entry | isometric | 3 × 15 s hold | 1.0 | bent-arm shoulder, core-lumbar |
| 3 | Scapular Pulls | Mid | isotonic | 3 × 8 reps | 1.0 | bent-arm shoulder, core-lumbar |
| 4 | Negative Pull-Up | Mid | isotonic | 3 × 3 reps | 1.0 | bent-arm shoulder, bent-arm elbow, core-lumbar |
| 5 | Pull-Up | Mid | isotonic | 3 × 5 reps | 1.0 | bent-arm shoulder, bent-arm elbow, core-lumbar |
| 6 | Tuck Front Lever Hold | Advanced | isometric | 3 × 12 s hold | **1.8** | straight-arm shoulder, core-lumbar |
| 7 | Advanced Tuck Front Lever Hold | Advanced | isometric | 3 × 12 s hold | **1.8** | straight-arm shoulder, core-lumbar |
| 8 | Straddle Front Lever Hold | Advanced | isometric | 3 × 10 s hold | **1.8** | straight-arm shoulder, core-lumbar |
| 9 | Full Front Lever Hold | Advanced | isometric | 3 × 8 s hold | **1.8** | straight-arm shoulder, core-lumbar |
| 10 | Front Lever Pull | Advanced | isotonic | 3 × 3 reps | **1.8** | straight-arm shoulder, straight-arm elbow, core-lumbar |

**Inflection point:** rank 5 (Pull-Up) → rank 6 (Tuck Front Lever Hold). Pulls end; levers begin. `straight-arm shoulder` replaces `bent-arm shoulder` as the dominant tendon target.

### 2.3 Core — `core_dragon_flag_path`

**Description:** *From plank to full dragon flag. Builds toward a strict dragon flag.*

| Rank | Exercise | Position | Movement | Target | Intensity | Joint pathways |
|---|---|---|---|---|---|---|
| 1 | Plank | Entry | isometric | 3 × 20 s hold | 1.0 | core-lumbar |
| 2 | Side Plank | Entry | isometric | 3 × 20 s hold | 1.0 | core-lumbar |
| 3 | Hollow Body Hold | Mid | isometric | 3 × 20 s hold | 1.0 | core-lumbar, core-hip-flexor |
| 4 | L-Sit (Floor) | Mid | isometric | 3 × 15 s hold | 1.0 | core-lumbar, core-hip-flexor |
| 5 | L-Sit (Parallel Bars) | Mid | isometric | 3 × 12 s hold | 1.0 | core-lumbar, core-hip-flexor, bent-arm shoulder |
| 6 | Hanging Leg Raise (Toes-to-Bar) | Advanced | isotonic | 3 × 6 reps | 1.0 | core-lumbar, core-hip-flexor, bent-arm shoulder |
| 7 | Tuck Dragon Flag | Advanced | isotonic | 3 × 5 reps | 1.0 | core-lumbar |
| 8 | Advanced Tuck Dragon Flag | Advanced | isotonic | 3 × 4 reps | 1.0 | core-lumbar |
| 9 | Straddle Dragon Flag | Advanced | isotonic | 3 × 3 reps | **1.8** | core-lumbar |
| 10 | Full Dragon Flag | Advanced | isotonic | 3 × 3 reps | **1.8** | core-lumbar |

**Inflection point:** rank 6 (Hanging Leg Raise) → rank 7 (Tuck Dragon Flag). Hip-flexor loading drops out as the dragon-flag family takes over and loads the lumbar spine end-range instead. `intensity_factor` jumps to 1.8 at rank 9 (Straddle Dragon Flag) — the first isotonic core node with full straight-body leverage.

## 3. Edge Topology

Edges live in `progression_edges(from_node_id, to_node_id, edge_type, priority)` (junction table — see `docs/PLAN.md` line 18 and `models.py` line 154 for why this replaced single-pointer columns).

**Edge types:**
- `progression` — harder variation. Forward in the rank chain.
- `regression` — easier variation. Used for on-the-fly swap when the user is fatigued, injured, or hasn't hit the fail threshold. `priority` selects which regression to offer first (lower number = preferred).
- `lateral` — parallel skill at the same rank family (e.g., bar vs rings, straddle vs tuck).

### 3.1 Forward progression (all trees)

Each tree gets 9 progression edges wiring rank `N` → rank `N+1`, generated by:

```sql
INSERT INTO progression_edges (from_node_id, to_node_id, edge_type, priority)
SELECT a.node_id, b.node_id, 'progression', NULL
FROM seed_<tree>_nodes a JOIN seed_<tree>_nodes b ON b.rank_level = a.rank_level + 1;
```

This produces 27 forward edges (9 × 3 trees) and is the entire linear spine.

### 3.2 Push tree branches

- **1 regression:** rank 8 (Freestanding Handstand Hold) → rank 6 (Wall Handstand Hold), priority 1.
  *Why:* the freestanding hold is the spot where the user most often needs to fall back to the wall hold — losing balance is the dominant failure mode, not strength loss. The regression skips rank 7 (Wall Handstand Push-Up) deliberately, because if the user is failing the *hold*, the push-up won't fix it.

### 3.3 Pull tree branches

- **2 regressions** from rank 6 (Tuck Front Lever Hold) → rank 1 (Dead Hang, priority 1) AND → rank 2 (Active Hang, priority 2).
  *Why:* tuck FL regressions are the textbook case the junction table was designed for. Dead hang is the safest full release; active hang keeps scapular engagement for users who want to keep training the shoulder position without the lever load. The engine offers dead hang first.
- **1 lateral:** rank 8 (Straddle Front Lever Hold) → rank 7 (Advanced Tuck Front Lever Hold).
  *Why:* a user holding the straddle but failing to progress to full FL can swap to the more compact advanced tuck at the same rank family to train straight-arm shoulder endurance with reduced lumbar leverage. Same rank_level (7→8 in this case = lateral, not backward).

### 3.4 Core tree branches

- **2 regressions** from rank 6 (Hanging Leg Raise) → rank 5 (L-Sit Parallel Bars, priority 1) AND → rank 4 (L-Sit Floor, priority 2).
  *Why:* hanging leg raise failures almost always trace back to insufficient compressed-L-sit strength. The L-sit on bars (priority 1) is the closer fix; the floor L-sit (priority 2) is the absolute regression if the bars are unavailable.

### 3.5 Edge totals

| Tree | Progression | Regression | Lateral | Total |
|---|---|---|---|---|
| Push | 9 | 1 | 0 | **10** |
| Pull | 9 | 2 | 1 | **12** |
| Core | 9 | 2 | 0 | **11** |
| **All** | **27** | **5** | **1** | **33** |

## 4. Placement Defaults

When a fresh user completes onboarding (`POST /api/v1/onboarding/place`), the placement algorithm runs per tree and writes a row into `user_node_state` with the chosen `current_node_id`. The entry-level node (rank 1) of each tree is the floor for the binary search:

| Tree | Entry node | Why it's the entry |
|---|---|---|
| Vertical Push | **Wall Push-Up** (rank 1) | The lowest bent-arm pushing skill; no prior strength assumed. Accessible to absolute beginners. |
| Horizontal Pull | **Dead Hang** (rank 1) | Pure passive grip + shoulder hang. No scapular engagement or pulling strength required. |
| Core | **Plank** (rank 1) | Foundational anti-extension brace; the safest entry to core-lumbar loading. |

The actual placed node is offset from rank 1 by `rir2_placement(rir2_pushup_reps)` plus the archetype adjustment from `assess_archetype(answers)` — see `calisthenics_api/placement.py`. A user who can already do 25 push-ups with RIR-2 (reps in reserve = 2) will land somewhere in the diamond / pike range in the push tree, not on Wall Push-Up. Rank 1 is the *floor*, not the default placement for any non-novice.

`onboarding.py:78` requires `rank_level` to be contiguous 1..N per tree; the seed data satisfies this (no gaps). If a future seed adds a rank 5.5 or skips a number, `place_user` raises `ValueError`.

## 5. Re-seeding Instructions

The seed is **embedded in the initial migration** — there is no separate seed script. To wipe and re-apply:

### Local development

```bash
# 1. Make sure Postgres is up
docker compose up -d db

# 2. Reset everything (drops all tables, including the function and the seed)
cd apps/api
uv run alembic downgrade base

# 3. Re-apply (creates schema, function, and 3 trees × 10 nodes)
uv run alembic upgrade head
```

To re-apply *without* dropping the DB (e.g., the migration is forward-only in CI):

```bash
cd apps/api && uv run alembic upgrade head
```

Because tree/exercise/node UUIDs are deterministic (`uuid5` of stable string keys), the migration is **idempotent on UUID collision** — re-running against an already-populated DB will fail on the unique constraint, which is the intended safety net. To re-seed from scratch you must `downgrade base` first, or drop the schema manually.

### Containerized (production / Coolify)

The API container's entrypoint runs the migration on every start (`apps/api/Dockerfile` line 30):

```dockerfile
CMD ["sh", "-c", "alembic upgrade head && uvicorn calisthenics_api.main:app --host 0.0.0.0 --port 8000"]
```

So on Coolify deploys the seed re-applies only if the migration is new. To force a full re-seed in production:

1. `docker compose exec db psql -U postgres -d calisthenics -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`
2. Restart the API container — `alembic upgrade head` runs against the empty schema and recreates all 30 nodes.

### Verifying the seed

After upgrade, you should see exactly 3 rows in `progression_trees`, 30 rows in `progression_nodes` (10 per tree), and 33 rows in `progression_edges`. A quick check:

```sql
SELECT t.slug, COUNT(n.id) AS nodes
FROM progression_trees t
JOIN progression_nodes n ON n.tree_id = t.id
GROUP BY t.slug
ORDER BY t.slug;
-- Expected:
--   core_dragon_flag_path          10
--   pull_front_lever_path          10
--   push_handstand_pushup_path     10
```

## Appendix: How the seed is generated (migration pattern)

The migration uses a **hybrid pattern** — hardcoded lists at the Python layer, then a SQL join to wire edges from a temp table:

1. **Python-side hardcoded lists** (`push_nodes`, `pull_nodes`, `core_nodes`) — 10-tuples of `(rank, name, movement_type, target_sets, target_reps, target_hold_secs, min_fail_threshold_reps, min_fail_threshold_secs, intensity_factor, joint_pathways, video_url)`. The schema is inlined as a comment above each list.

2. **`_seed_tree()` helper** (lines 421–486) — for each tuple, it:
   - Generates `tree_id = uuid5(NAMESPACE_DNS, "calisthenics:tree:{slug}")`.
   - Generates `exercise_id = uuid5(NAMESPACE_DNS, "calisthenics:exercise:{exercise_name}")`.
   - Generates `node_id = uuid5(NAMESPACE_DNS, "calisthenics:node:{slug}:{rank}")`.
   - Inserts into `progression_trees`, `exercises`, `progression_nodes`.
   - Captures the `(rank_level, node_id)` pair into a per-tree `TEMP TABLE` (`seed_push_nodes`, `seed_pull_nodes`, `seed_core_nodes`) scoped `ON COMMIT DROP`.

3. **SQL edge wiring** (lines 359–405) — joins the temp tables back on `rank_level + 1` for the linear progression, plus hand-written extra regressions and the single lateral.

To **add a new tree**, copy the `push_nodes = [...]` block, change the slug/name/description/list, and add a matching `_seed_tree(...)` call plus one temp table in the `CREATE TEMP TABLE` block (lines 286–289) and one `INSERT INTO progression_edges` block in the edge-wiring section.

To **add a node to an existing tree**, append a tuple to that tree's list. Keep rank levels contiguous 1..N — `onboarding.py` will fail otherwise.