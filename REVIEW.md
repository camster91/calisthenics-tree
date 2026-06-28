# Project State Review — 2026-06-25 (updated 2026-06-28: Sprint 37 — Apple Fitness+ design language)

Solo-dev review of the repo against `docs/PLAN.md`. Goal: figure out what's actually
done vs. what the plan says, and lay out a concrete execution order.

**2026-06-28 update:** Sprint 37 — Apple Fitness+ design language refresh
applied across the entire app. Refreshed `tokens.ts` (true black #000,
warm orange-red #FF6B1A, Apple system colors, squircle radii 20px/28px,
heavy display weights 700-900, tight tracking on display sizes, glass
surfaces with backdrop-blur+saturate(180%), spring motion curves).
Component library updated: Button (squircle + spring press), Card
(CVA variants default/glass/hero), BigNumber (display-grade numeral
36-128px with tabular-nums), SegmentedControl (iOS-style picker on
Radix Tabs). 14 screens polished (HomePage, WorkoutLogPage,
WorkoutDonePage, HistoryPage, TreePage, InsightsPage, FeedPage,
ProfilePage, OnboardingQ1/Q2/Result, LandingPage, LoginPage,
AuthVerifyPage, SettingsPage, NodeLandingPage). **Live in production**
at `https://workout.ashbi.ca`. TypeScript clean, build green, 10/10
a11y tests pass (zero WCAG AA violations), 81 backend tests pass +
31 skipped (DB-integration), 96 E2E pass + 6 chromium-only skips.

**2026-06-26 update:** Phase 5 (monetization) deferred. The billing scaffold from
Sprints 16-17 was fully torn down in Sprint 22 — payment routes, provider
abstraction, pricing page, paywall dialog, subscription fields on User, friend
limit, and all related tests/configs. The app is free for everyone; no paid
tier exists. `docs/research/pricing-model.md` and `docs/decisions/D18-*` are
kept as design history but are NOT active roadmap.

**Sprint 25 verification (2026-06-26):** The T38 a11y suite
(`apps/web/tests/a11y/`) was last flagged as "tests written, not verified" in
the original Phase 1.5 section above. Sprint 25 ran the full 10-test suite
(axe-core + keyboard navigation + visual contrast) on home, settings, and
components. **All 10 pass with zero WCAG AA violations.** The radiogroup
pattern (theme toggle), skip-link-first focusable, and 48dp tap-target
checks all hold.

## Open work — needs Cameron

These items cannot be done by an AI agent in this repo because they require
Cameron's accounts + VPS access + decisions. Listed so they don't get lost.

| Item | What's needed | Estimated effort |
|---|---|---|
| **Production deploy** | Real `POSTMARK_TOKEN` + `SENTRY_DSN`; `CADDY_DOMAIN=calisthenics-tree.com` + `CADDY_EMAIL` in `/root/calisthenicstree-secrets/.env`; `ssh root@187.77.26.99 'cd /opt/calisthenicstree && make deploy'`. `docker-compose.prod.yml` is ready, deploy script is ready, smoke test is wired. | 1 hour |
| **P4 — Capacitor mobile shell** | Apple Developer account (for HealthKit + Apple Watch capability declarations + provisioning). Wire `npx cap add ios` + `npx cap add android`, port the web build, configure HealthKit entitlement + Info.plist usage descriptions, write the WatchKit extension stub. | 2-3 weeks |
| **App Store + Play Store submission** | Apple Developer account ($99/yr) + Google Play Console ($25 one-time). App Store screenshots (T40 work is done — wire them into App Store Connect). Privacy policy URL (already at /privacy). TestFlight internal beta with 5-10 testers for a week. | 1 week (after P4 ships) |
| **Soft-delete grace period (D19 §deletion)** | D19 §deletion says "7-day grace period" before hard delete. Current `DELETE /users/me` is immediate. Add `deleted_at` column + a daily cron that hard-deletes tombstones older than 7 days. | 4 hours |
| **Email template polish** | Current magic-link email is inline plain text/HTML. Real prod wants a designed Postmark template (logo, brand colors, copy). Postmark supports templated sends — replace the inline HTML in `apps/api/calisthenics_api/routes/auth.py:_send_magic_link_email` with a template ID + model dict. | 2 hours |
| **CI/CD pipeline** | GitHub Actions workflow that runs `make preflight` + `make test` on every PR, deploys on merge to main via `make deploy`. (Originally deferred to after P5 launch — still deferred since P5 itself is deferred.) | 1 day |
| **Cross-browser test impl hardening** | 6 E2E tests are Chromium-only (marked `test.skip` with a comment). Generalizing them needs Firefox-aware navigator.share mocking, WebKit-aware focus-order assertions, etc. App behavior is correct in Firefox/Safari — it's the test plumbing that's per-browser tuned. | 4 hours |

None of these are blocking P1-P4. They're the next concrete units of work
once Cameron is ready to ship.

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
| T34 Design tokens | ✅ **Apple Fitness+ direction (Sprint 37)** | `apps/web/src/tokens.ts` |
| T35 shadcn-style UI + 8 workout components | ✅ **+ BigNumber, SegmentedControl (Sprint 37c)** | `src/components/{ui,workout}/` |
| T36 App icon (all sizes) | ✅ | `apps/web/public/icons/icon-{40,60,80,...}.png` |
| T37 Screen inventory + 19 wireframes | ✅ | `SCREEN_INVENTORY.md` + `src/pages/wireframes/` |
| T38 axe-core + keyboard nav + visual contrast | ✅ **verified Sprint 25, re-verified Sprint 37o (10/10 pass)** | `apps/web/tests/a11y/{axe,keyboard,visual}.spec.ts` |
| T39 `/api/v1/share/[unlock_id].png` endpoint | ✅ Sprint 18 | `apps/api/calisthenics_api/routes/share.py` |
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
- **`docker-compose.prod.yml`** ✅ done — `docker-compose.prod.yml` now lives at the repo root, parallel to `docker-compose.yml` (which is now the local-dev variant). Prod compose adds TLS via env-driven Caddy, named volumes, no db port mapping, resource limits, and log rotation. `scripts/deploy-to-vps.sh` uses the prod variant. (Sprint 20)
- **`uv sync` footgun**: bare `uv sync` strips the `[project.optional-dependencies].dev` extras, which silently breaks `pytest`. Fix candidates: (a) update README to always show `uv sync --extra dev`, (b) move pytest/ruff to `[tool.uv].dev-dependencies` so they're default with `uv sync`, or (c) add a `Makefile` / `justfile` target that wraps it. Option (b) is cleanest. Quick fix — could land in Sprint 2.

### Sprint 2 — Close P1.5 blockers (~half day)
- Run `apps/web/tests/a11y`, fix any axe violations
- Add `/api/v1/share/[unlock_id].png` FastAPI route
- Smoke-test gym-glare variant toggles correctly
- (Bonus) Fix `uv sync` footgun from Sprint 1 follow-ups

**Sprint 2 follow-ups flagged by the swarm:**
- **`theme.css` postinstall**: ✅ done — `"postinstall": "npm run theme:build"` is in `apps/web/package.json` (Sprint 2).
- **PEP 735 deprecation**: ✅ done — `[tool.uv].dev-dependencies` → `[dependency-groups] dev` in `apps/api/pyproject.toml` (Sprint 14). No warning emitted by `uv sync`.
- **`docker-compose.prod.yml`** ✅ done — repo-root prod compose with TLS via env-driven Caddy, named volumes, no db port mapping, resource limits, and log rotation. `scripts/deploy-to-vps.sh` uses it. (Sprint 20)

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

### Sprint 6 status (2026-06-26 update)
- **Monetization deferred.** Sprint 22 fully removed the billing scaffold
  (Stripe/StoreKit/NullProvider abstraction, 4 billing routes, pricing
  page, paywall dialog, friend limit, all related tests + configs).
  App is free for everyone. The pricing model in `docs/research/pricing-model.md`
  + the StoreKit edge cases in `docs/decisions/D18-*` are kept as design
  history but are NOT active roadmap. Re-introducing paid tiers is a
  `git revert` of Sprint 22 + restoration of the historical research docs.

### Sprint 7 — P6 iterate (ongoing, post-launch)
- Driven by real user data, not pre-planned

### Production deploy + bugfixes (2026-06-27)

First production deploy at `workout.ashbi.ca` (wildcard DNS at *.ashbi.ca →
VPS 187.77.26.99, Traefik-fronted). Pre-deploy QA surfaced **10 real bugs**
across frontend + backend; all fixed and shipped in one session.

**Deploy plumbing (committed 6a92fcc..d915ac3):**
- Traefik dynamic config: `/opt/traefik/dynamic/workout-addon.yml` + `merge-workout.py`. Some other process on the VPS regenerates `routers.yml` periodically — re-run the merge script if workout routes disappear.
- Host ports: web=3025, api=3026 (3020 was taken by `lull-relay`). Both bound to 127.0.0.1.
- Caddy in web container: `route /api/* → api:8000`, `route /healthz → api:8000`, SPA fallback for `/share/<unlockId>` + everything else.
- LE certs auto-issued for `workout.ashbi.ca` + `api.workout.ashbi.ca` + `www.workout.ashbi.ca` (verified in `/opt/traefik/acme.json`, 19 total certs).
- Soft-delete daily cron: `17 3 * * * cd /opt/calisthenics-tree && make purge-deleted >> /var/log/calisthenicstree/purge.log 2>&1`.
- `make deploy` script default `VPS_DEPLOY_DIR` corrected to `/opt/calisthenics-tree` (with hyphen, matches repo name).

**Bugs found and fixed during deploy QA:**

1. **API build context bug** (`api/Dockerfile` paths assume `apps/api/` is the build context, but compose had `context: .`). Fixed both `docker-compose.yml` + `docker-compose.prod.yml`. CI never caught it because CI only builds the web container.
2. **`npm ci` ERESOLVE**: project pins `typescript@~6.0.2` but `react-i18next@15.7.4` wants `typescript@^5`. Lockfile pins a working resolution; added `--legacy-peer-deps` to web Dockerfile.
3. **`prebuild` hook requires running Vite dev server**: dropped it from `package.json` (committed PNGs at `apps/web/public/share/*.png` are the canonical production asset).
4. **Alembic 0001_initial.py multi-statement SQL**: asyncpg rejects prepared statements with multiple commands. Split the 3 `CREATE TEMP TABLE` and 7 `INSERT INTO progression_edges` blocks into individual `op.execute()` calls.
5. **`POSTGRES_PASSWORD` not reaching containers**: was an `--env-file` quirk; resolved by adding `--env-file /root/calisthenicstree-secrets/.env` to `docker compose` invocations.
6. **`routes/trees.py` `n.movement_type` AttributeError**: movement_type lives on Exercise, not ProgressionNode. Test didn't exercise the response shape end-to-end.
7. **`routes/nodes.py` `node.movement_type` AttributeError**: same class of bug, fixed by reading `exercise.movement_type` from the join tuple. (`hasattr(...)` ternary was a band-aid from a previous attempt — replaced with the correct attribute.)
8. **Caddy `try_files` rewrite ran before path-specific handlers**: switched from bare `reverse_proxy /api/*` (which was overridden by try_files) to explicit `route /api/* { ... }` blocks. `handle_path` doesn't work either — it's a subroute, not a separate route.
9. **Caddy `route /share/*` proxied SPA route to api**: 404'd `/share/<unlockId>` for OG previews. Removed the route — `/share/<id>.png` served as static by file_server, `/share/<unlockId>` falls through to SPA fallback.
10. **OnboardingResultPage guard bounced to /login during auth hydration**: `if (authStatus !== 'authenticated')` matched `'loading'` too. Fixed to `if (authStatus === 'loading') return; if (authStatus === 'anonymous') navigate('/login')` — matches `RequireAuth`'s pattern.

**Cosmetic fixes:**
- Home page Backend status: was showing `/healthz → checking…` (404'd). Fixed by proxying `/healthz` to api.
- Share card footer `calisthenicstree.app` → `workout.ashbi.ca` (old domain before Sprint 27 switch).

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