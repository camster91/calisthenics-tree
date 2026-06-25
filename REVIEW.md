# Project State Review — 2026-06-25

Solo-dev review of the repo against `docs/PLAN.md`. Goal: figure out what's actually
done vs. what the plan says, and lay out a concrete execution order.

## TL;DR

P1 backend is **~90% done** (4 endpoints + auth working, tests passing). P1.5 design
system is **~85% done** (tokens, 19 wireframes, components, app icon, marketing assets
all shipped — only axe-core run + share-card API endpoint remain). **P2 is untouched.**

To unblock P2 we need to close ~6 P1 docs/ops gaps and 2 P1.5 gaps. That's roughly
**1 day of focused work** before the web app build can begin.

## Phase 1 — Backend (status: ~90%)

| Item | Status | Where |
|---|---|---|
| Postgres schema + migrations | ✅ | `apps/api/alembic/versions/0001_initial.py` |
| Seed 3 trees × 10 nodes | ✅ | same migration |
| `check_node_unlock_status` promotion | ✅ | tests pass |
| Placement algo + tests | ✅ | `apps/api/calisthenics_api/placement/` |
| Tendon strain calc + tests | ✅ | `apps/api/calisthenics_api/tendon/` |
| `GET /api/v1/users/me/progressions` | ✅ | `routes/progressions.py` |
| `POST /api/v1/onboarding/place` | ✅ | `routes/onboarding.py` |
| `POST /api/v1/workouts/sync` | ✅ | `routes/workouts.py` |
| `/healthz` | ✅ | `routes/health.py` |
| Bearer auth (Phase 1 simplified) | ✅ | `auth.py` — single dev token, JWT later |
| Test suite | ✅ | 50 passed / 10 skipped (DB-dependent) |
| **`DECISION.md`** at root | ❌ | gap |
| **`apps/api/.env.example`** | ❌ | gap |
| **`ARCHITECTURE.md`** | ❌ | gap |
| **`SEED_DATA.md`** | ❌ | gap |
| **`RUNBOOK.md`** | ❌ | gap |
| **Sentry** integration | ❌ | gap |
| UptimeRobot (external) | ❌ | manual setup, document in RUNBOOK |
| `pg_dump` cron | ❌ | VPS-side, document in RUNBOOK |
| `Makefile` | ❌ | optional — `just` or shell scripts fine |
| `CONTRIBUTING.md` | skip | solo dev |

**Auth gap (planned but deferred):** Apple Sign-In + email magic link via Postmark
(PLAN.md Gap 2) is NOT implemented. Phase 1 ships single-token bearer; production
swap-in is documented but not built. This is fine for the web app — magic-link
backend ships with Phase 2 onboarding, Apple Sign-In ships with P4 native.

## Phase 1.5 — Brand + UX system (status: ~85%)

| Item | Status | Where |
|---|---|---|
| T34 Design tokens | ✅ | `apps/web/src/tokens.ts` |
| T35 shadcn-style UI + 8 workout components | ✅ | `src/components/{ui,workout}/` |
| T36 App icon (all sizes) | ✅ | `apps/web/public/icons/icon-{40,60,80,...}.png` |
| T37 Screen inventory + 19 wireframes | ✅ | `SCREEN_INVENTORY.md` + `src/pages/wireframes/` |
| T38 axe-core + keyboard nav + visual contrast | ⚠️ tests written, not verified | `apps/web/tests/a11y/{axe,keyboard,visual}.spec.ts` |
| T39 `/api/v1/share/[unlock_id].png` endpoint | ❌ renderer exists, no API route | gap |
| T40 App Store screenshots + preview video | ✅ | `apps/web/marketing/` |

**T38/T39 are the only Phase 1.5 blockers.** T38 just needs `npx playwright test
apps/web/tests/a11y` run + any failures fixed. T39 wraps the existing renderer
in a FastAPI route + serves the PNG with proper content-type.

## Phase 2 — Web app (status: 0%)

Nothing built. `HomePage.tsx`, `ComponentsPage.tsx`, `SettingsPage.tsx` exist as
placeholders. No real backend wiring, no auth UI, no onboarding flow, no DAG
visualization against real data.

This is the big one — ~2-3 weeks of solo work to land the gate (end-to-end flow
in browser, screenshots taken, show to 3 calisthenics people).

## Phase 3 — SEO landing pages (status: 0%)

Nothing built. Should follow P2 — no point launching SEO pages before the app
actually works.

## Phase 4 — Native shell (status: 0%)

Nothing built. Capacitor wrap of P2 SPA + HealthKit stub + Watch companion.

## Phase 5 — Monetization + launch (status: 0%)

StoreKit paywall, App Store submission, Reddit launch. Cannot start until P4 ships.

## Recommended execution order (solo-dev realistic)

### Sprint 1 — Close P1 docs + ops gap (~1 day)
- `DECISION.md` (kill criteria + scope rules from PLAN.md)
- `apps/api/.env.example`
- `ARCHITECTURE.md` (schema + module overview)
- `SEED_DATA.md` (3 trees × 10 nodes inventory)
- `RUNBOOK.md` (deploy + rollback + pg_dump + Sentry)
- Sentry FastAPI integration (3 lines in `main.py`)

**Sprint 1 follow-ups flagged by the swarm (not blocking, but worth tracking):**
- **`docker-compose.prod.yml`** is referenced in RUNBOOK.md but doesn't exist in repo. It's created during first-time deploy on the VPS (not a checked-in file). Acceptable as-is, but could be added for reproducibility — Sprint 7+ polish.
- **`uv sync` footgun**: bare `uv sync` strips the `[project.optional-dependencies].dev` extras, which silently breaks `pytest`. Fix candidates: (a) update README to always show `uv sync --extra dev`, (b) move pytest/ruff to `[tool.uv].dev-dependencies` so they're default with `uv sync`, or (c) add a `Makefile` / `justfile` target that wraps it. Option (b) is cleanest. Quick fix — could land in Sprint 2.

### Sprint 2 — Close P1.5 blockers (~half day)
- Run `apps/web/tests/a11y`, fix any axe violations
- Add `/api/v1/share/[unlock_id].png` FastAPI route
- Smoke-test gym-glare variant toggles correctly
- (Bonus) Fix `uv sync` footgun from Sprint 1 follow-ups

**Sprint 2 follow-ups flagged by the swarm:**
- **`theme.css` postinstall**: `apps/web/src/.generated/theme.css` is git-ignored but required by `index.css`. Fresh clones need `npm run theme:build` before Vite boots. Fix: add `"postinstall": "npm run theme:build"` to `apps/web/package.json`. Tiny one-liner, do in Sprint 3 setup.
- **PEP 735 deprecation**: uv emits a deprecation warning on every run because `[tool.uv].dev-dependencies` is deprecated in favor of PEP 735 `[dependency-groups] dev = [...]`. Task in Sprint 3+ cleanup (cosmetic, no behavior change).
- **`docker-compose.prod.yml`** still not in repo (deploy-time artifact). Sprint 7+ polish.

### Sprint 3 — P2 web app (~2-3 weeks)
- Auth UI + magic-link backend
- Onboarding flow (Q1/Q2/Q3 → RIR-2 test → placement) → `/api/v1/onboarding/place`
- Workout log screen with real `POST /api/v1/workouts/sync`
- DAG browse with real `GET /api/v1/users/me/progressions`
- Tendon strain card on `/insights/tendon`
- PostHog wiring
- i18n scaffold (`useTranslation` + `en.json`)

### Sprint 4 — P3 SEO landing pages (~3-4 days)
- ~10 landing pages for hero nodes (Planche, Front Lever, Handstand, Dragon Flag, …)
- Privacy / Terms / Support pages

### Sprint 5 — P4 native shell (~2 weeks)
- Capacitor wrap of P2 SPA
- HealthKit permission + write
- Watch complication + tap-to-start
- TestFlight internal beta

### Sprint 6 — P5 launch (~1 week)
- StoreKit 2 paywall ($5.99/mo, $29.99/yr, $99 lifetime)
- App Store submission (2 weeks early — HealthKit review is 3-7 days first time)
- Reddit launch posts

### Sprint 7 — P6 iterate (ongoing, post-launch)
- Driven by real user data, not pre-planned

## Open questions before Sprint 1

1. **CI/CD?** Repo has no `.github/`. PLAN.md describes `GitHub Actions on push
   to main → rsync to VPS → Coolify webhook`. Want me to scaffold that now or
   defer to after P5 launch? (My take: defer. Solo dev, pushing direct to VPS
   via SSH is fine until you have someone else reviewing PRs.)

2. **Magic-link auth provider.** PLAN.md says Postmark ($15/mo at 10K users).
   Alternatives: Resend (cheaper), AWS SES (cheapest), Supabase Auth (free +
   handles the JWT issuance). Any preference, or pick when we get to Sprint 3?

3. **Hosting.** PLAN.md locks Coolify on VPS 187.77.26.99. Is that still the
   target, or did infra move?

## What I'd start with right now

**Sprint 1** — close the P1 docs gap. ~6 small docs files + one Sentry wiring
line. Pure housekeeping, no decisions to make, unblocks P2 immediately.

Say the word and I'll grind Sprint 1 in one sitting.