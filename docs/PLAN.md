# Calisthenics Platform — Build Plan
Date: 2026-06-25
Sources: gdoc 18P0BTcd9uW_b_NTFAlRvaeVYxugdayYVB5prWDmytMo (architecture) + 1xVncsrmJYVdeBClzHr3SmT3hnKsdi41HDCqAj9f08RE (placement + APIs)
Research: /tmp/research/*.md (8 files)

## Honest read of the source docs

**Worth keeping:**
- DAG progression model (single-pointer limitation noted below — fixed via junction table)
- Placement algorithm (binary-search + RIR-2 sub-maximal test)
- PostgreSQL schema with `check_node_unlock_status` promotion function
- Offline-first sync loop with `/api/v1/workouts/sync` reconcile
- Tendon strain score with rolling-4-week deload alerts
- Shareable routine links (`/shared/routine/<id>` deep-link pattern)

**Needs revision before building:**
- 24-week timeline is fantasy at solo pace. Realistic solo: 9-12 months to TestFlight beta, not 24 weeks.
- DAG has single regression/progression pointers — real progressions branch (tuck FL can regress to advanced tuck FL OR rings tuck FL OR weighted tuck FL). Single pointer is load-bearing for the whole "regression engine" pitch. Fix: junction table `progression_edges(from_node_id, to_node_id, edge_type)`.
- "Front Lever hold detected" on WatchOS — Watch can't read intent. Needs `HKWorkoutSession` + manual start.
- Programmatic SEO collides with FitnessFAQs / Calisthenics Movement / ATN. Without domain authority + 50+ articles, ranking is a 6-12 month grind, not a launch lever.
- HealthKit triggers App Store health-data review — paperwork is real and slows launch.
- Zero mention of founder/team, budget, or runway.

## Competitive reality (research, 2026-06-25)

Source: `/tmp/research/competitive-audit.md`

**DAG / skill-tree is table stakes, not a moat.** At least six shipped iOS/Android apps already advertise branching skill trees with unlock mechanics: **Calistree** (5-year head start, 1,300+ exercises, $5.99/mo / $179 lifetime), **BodyTree** (Apr 2026 launch, 242 exercises / 32 branches), **Calistack** (Jun 2026), **Thenics**, **Fitloop**, **Calisthenics Family**. A new entrant whose *only* differentiator is "we have a DAG" will be one of seven.

**Community tracking habit** (Reddit r/bodyweightfitness, ~1.4M members): users split between Hevy with custom exercises (dominant), niche calisthenics apps, and Notes/Google Sheets. The repeated missing-feature complaint: *"I want to see what skill comes next, and the app should tell me I'm ready."* That gap is the DAG premise — and it's the most-requested missing feature in Hevy reviews.

**Hevy user switching behavior** (`/tmp/research/hevy-user-switching.md`): top churn reasons are social-feed fatigue, slow shipping, privacy, Watch bugs, Pro tier UX limits. Friction dominated by *UI muscle memory + sunk-cost Pro lifetime ($74.99)*, not data export. Switch trigger is usually a single workflow gap, not broad dissatisfaction. ~30–50% of triers boomerang back to Hevy within 30 days.

**Pricing benchmarks:** $5.99/mo is the floor (Calistree, Fitloop). Hevy at $800k MRR is the comparator; existing tree apps are all sub-1M-download indie products.

**Verdict:** DAG is a *requirement*, not a *differentiator*. The differentiator must live in an adjacent axis: tracking depth, content quality, community/social mechanics, or richer gamification.

## HealthKit + watchOS realities (research, 2026-06-25)

Sources: `/tmp/research/healthkit-review-process.md`, `/tmp/research/watchos-detection-limits.md`

- App Store HealthKit review = Guideline 5.1.1 + 1.4.1 + 2.5.1 scrutiny + App Privacy nutrition label. **First submissions typically 3-7 days, not 24-48h.** Plan: submit 2 weeks early.
- Info.plist strings must be app-specific and list what data + why. Generic boilerplate gets rejected. Both iOS app target AND watchOS extension target need the keys.
- "Front Lever hold detected: Log 12s set?" auto-prompts: **impossible in v1**. Apple's first-party detection covers only walking/running/swimming/elliptical/rowing. No third-party API classifies calisthenics holds. v1 design: tap-to-start Watch complication + `CMBatchedSensorManager` auto-segmentation within an active session.

## Differentiation decision: Path B (Community/social DAG)

Locked 2026-06-25.

- **A (Tracker-first DAG)** = Hevy parity slog, 7-year head start to beat.
- **C (Coaching video per node)** = 6-12 months content production before premium feel.
- **B (Community/social DAG)** = cleanest moat; none of 7 existing apps do social well. Network-effect features Calistree can't retroactively clone.

Risks accepted:
- Empty friend lists look worse than no friends list (design care required).
- Anti-spam / moderation is an ops burden.

Mitigations:
- Social features land Phase 4+ after monetization proves the core.
- Start with "share your unlock" cards → friend DAGs (P4) → seasonal events (P5) only after 1k+ MAU.

**Implementation impact on phases:**
- Phase 1 backend: unchanged. Schema serves all paths.
- Phase 2 UI: workout logging screen stays the same. Add social-feed tab (read-only) at the bottom showing friends' recent unlocks. No DAG-aware UI changes.
- Phase 3 SEO: unchanged.
- Phase 4 native: adds Apple Push Notifications for friend DAG updates + share extension for social share cards.
- Phase 5 monetization: social features free tier, advanced (seasonal events, leaderboards) Pro.

## MVP scope recommendation

Skip everything that isn't:
1. A working Android APK or iOS TestFlight
2. That loads, places the user, logs one workout, unlocks or regresses one node
3. Behind a paywall that takes a real credit card

Everything else is polish. Don't build what you can't show working.

## Locked decisions

| Decision | Choice | Source |
|---|---|---|
| **Differentiation** | Path B (Community/social DAG) | Reasoning above |
| **Hosting** | Coolify on Ashbi VPS 187.77.26.99 | Free, infra you know |
| **Domain** | `calisthenics-tree.com` | Research confirms it's the cleanest option |
| **App name** | **Calisthenics Tree** (NOT Calisteniapp — live competitor) | `/tmp/research/app-name-conflict-check.md` |
| **Bundle ID** | `com.ashbi.calisthenicstree` | (renamed from calisteniapp placeholder) |
| **App Store primary category** | Health & Fitness | `/tmp/research/app-store-category.md` |
| **App Store secondary category** | Social Networking | Same |
| **Pricing** | **$5.99/mo, $29.99/yr (50% off), $99 lifetime, 7-day trial** | `/tmp/research/pricing-model.md` — replaces $4.99/mo placeholder |
| **Analytics** | PostHog Cloud (free 1M events/mo) | `/tmp/research/analytics-stack.md` |
| **Auth** | Apple Sign-In (iOS) + email magic link (web/Android) via Postmark | Gap 2 below |
| **Pricing math** | $5.99 anchor, 50/50 monthly/annual mix → ~$4.24 blended ARPU, ~$50 net LTV, $16 CAC ceiling | Pricing model |

## Sequenced phases (solo, 12-month realistic)

### Phase 1 — Schema + placement (Weeks 1-3)
Pure backend with zero UI risk. All portable to any client later.

- [ ] Postgres schema (full DAG + edges junction table + tendon strain table)
- [ ] Seed 3 trees: Push (Handstand Push-Up path), Pull (Front Lever path), Core (Dragon Flag path)
- [ ] `check_node_unlock_status` promotion function
- [ ] Binary-search placement algorithm as a pure function + unit tests
- [ ] Tendon strain calculator as a pure function + unit tests
- [ ] `/api/v1/users/me/progressions` and `/api/v1/workouts/sync` endpoints with OpenAPI spec
- [ ] Auth: Apple Sign-In + email magic link, JWT issuance + refresh
- [ ] Dev onboarding: README, architecture doc, .env.example, Makefile, CONTRIBUTING.md
- [ ] Sentry + UptimeRobot + RUNBOOK.md + pg_dump cron
- [ ] DECISION.md at repo root with kill criteria + scope rules

**Gate:** All endpoints return correct shapes against seeded data; promotion function tested against 5 synthetic workouts; auth flow works end-to-end with a test Apple identity token + a test magic-link email.

### Phase 1.5 — Brand + UX system, code-as-design-system (Weeks 4-6)
**No Figma.** Tailwind config + tokens.ts + shadcn/ui + custom components ARE the design system. Vision-iterate on Playwright screenshots until each screen reads right.

The old T31 "Brand: app name, icon, screenshots" stub is decomposed into the 7 cards below (T34-T40). T31 stays as the Phase 5 acceptance check.

- [ ] T34 — Design tokens + Tailwind theme (semantic colors, type scale, spacing, motion timings). Gym-glare variant.
- [ ] T35 — shadcn/ui base + custom workout components (WorkoutTimer, RepCounter, NodeCard, NodeTree, TendonStrainCard, RegressionPrompt, UnlockShareCard)
- [ ] T36 — App icon via image_generate (Hailuo) + SVG refinement, all required sizes
- [ ] T37 — Screen inventory (16 screens with states) + low-fi HTML wireframes via Playwright + vision-iteration
- [ ] T38 — Accessibility baseline (WCAG AA, axe-core, 48dp tap targets, keyboard nav, reduced-motion) + gym-glare variant
- [ ] T39 — Share card generator: HTML+CSS template → PNG via Playwright. `/api/v1/share/[unlock_id].png`
- [ ] T40 — App Store screenshot production (3 required + 1 preview video). Render via Playwright at 1290×2796 with marketing copy overlay

**Gate:** design tokens committed, 7+ custom components built and Playwright-screenshotted, axe-core returns 0 violations on every wireframe screen, gym-glare toggle visibly improves contrast, app icon exported in all sizes, 3 App Store screenshots + preview video ready for Phase 5 submission.

### Phase 2 — Web app, no native (Weeks 7-10)
Validate the loop with the cheapest possible UI.

- [ ] React + Vite + Tailwind SPA, deployed live on `calisthenics-tree.com` from day 1
- [ ] Onboarding flow (3 questions → RIR-2 pushup test → node placement)
- [ ] Workout log screen (giant tap targets, hold timer, rep counter)
- [ ] DAG visualization (read-only tree browser, "unlocked" glow on current node)
- [ ] Tendon strain read-only card
- [ ] PostHog analytics wired in
- [ ] i18n scaffold (useTranslation + en.json baseline)

**Gate:** End-to-end flow works in a browser. Screenshot every screen. Show to 3 calisthenics people.

### Phase 3 — Programmatic SEO landing pages (Weeks 9-11)
Cheapest acquisition. Validates the funnel before paying Apple.

- [ ] 1 static landing page per skill node (~30 nodes across 3 trees = 30 pages)
- [ ] Each page has the "where you are" calculator (current hold seconds → suggested node)
- [ ] Each page CTA: "Track this in the app" → App Store deep link with `node_id` param
- [ ] Support / Privacy / Terms pages hosted on the same domain
- [ ] Submit sitemap to GSC, IndexNow ping on deploy

**Gate:** 5 pages indexed in Google within 2 weeks of deploy. Track impressions in GSC.

### Phase 4 — Native shell (Weeks 12-20)
Capacitor wrap of the web app + HealthKit stub. Don't fight native complexity yet.

- [ ] Capacitor wrap of Phase 2 SPA
- [ ] HealthKit permission request (read-only workouts + body metrics)
- [ ] HealthKit write: completed workouts → Apple Health
- [ ] WatchOS companion: HKWorkoutSession start button + CMBatchedSensorManager auto-segmentation (NO auto-detect)
- [ ] Share extension: share unlock cards to social
- [ ] App Store Connect listing (Calisthenics Tree name, screenshots, privacy nutrition label)
- [ ] TestFlight internal beta (10-20 users)

**Gate:** TestFlight builds install. Watch app starts a workout session on tap.

### Phase 5 — Monetization + launch (Weeks 21-28)
Revenue before polish.

- [ ] StoreKit 2: $5.99/mo, $29.99/yr, $99 lifetime, 7-day trial on monthly + annual
- [ ] Paywall gate: Pro trees (Planche, Front Lever, Iron Cross) locked; Push-ups/Pull-ups/Squats free
- [ ] App Store review submission (HealthKit triggers extra review — submit 2 weeks early)
- [ ] Brand: icon, screenshots, preview video
- [ ] Reddit launch (r/bodyweightfitness, r/calisthenics, r/Calistree honest mention)
- [ ] GDPR compliance doc, privacy policy live, terms of service live
- [ ] Goal: 100 free-tier signups in 14 days post-launch

**Gate:** First paying subscriber. Track LTV per channel.

### Phase 6 — Iterate (Week 29+)
Don't plan this. Let real users tell you what's broken.

- Friend DAGs at 1k MAU
- Seasonal events at 5k MAU
- Skill leaderboards at 10k MAU

## Kill criteria (locked)

- **Month 3** (post-launch): if <50 free-tier users, pause marketing spend and reassess.
- **Month 6**: if MRR < $100, pause new feature work, write a post-mortem, archive the project.
- **Month 12**: if MRR < $500, accept as a portfolio piece, not a business.

## Anti-features (don't build)

- Custom video upload / video hosting (use YouTube embeds)
- Social feed beyond friend DAGs and unlock shares
- Computer vision on form (Phase 6+ only if retention data says it matters)
- Native Android (Capacitor handles it; native Android build is its own 6-week project) until $500 MRR
- Voice control / Siri integration (low-ROI, breaks offline-first promise)
- Coaching video per node (Path C was rejected for this build)

## Gaps closed in plan review

### Gap 1 — Repo location and dev environment
`~/projects/calisthenics-platform/` is the working dir, bootstrap documented in T1.

### Gap 2 — Auth model
Apple Sign-In (iOS) + email magic link (web/Android) via Postmark. Cost: ~$15/mo at 10K users.

### Gap 3 — i18n posture
English-only v1 but scaffold from day one. `i18n/` directory + `useTranslation()` everywhere.

### Gap 4 — Analytics
PostHog Cloud (free 1M events/mo). Self-host deferred until 5M+ events/mo. Wire in Phase 2.

### Gap 5 — Brand
App name: **Calisthenics Tree** (NOT Calisteniapp — see /tmp/research/app-name-conflict-check.md for why). Bundle ID: `com.ashbi.calisthenicstree`. Icon via Fiverr commission or Figma DIY.

### Gap 6 — Support / Privacy / ToS
Pages hosted on `calisthenics-tree.com/{support,privacy,terms}`. Generator: termsfeed.com free tier. You review before publishing.

### Gap 7 — GDPR + EU medical device posture
We're wellness/educational, not medical. Compliance one-pager in `compliance/decisions.md`. EU 2026 regulated-medical-device status: declare "no."

### Gap 8 — Founder/team
Solo: Cameron Ashley. App store entity: Ashbi Design.

### Gap 9 — Kill criteria
Locked above. Document in `DECISION.md` at repo root.

### Gap 10 — Dev onboarding
README + architecture doc + seed-data doc + .env.example + Makefile + CONTRIBUTING.md. Phase 1 deliverable.

## Deploy, infra, ops (locked)

**Hosting:** Coolify on the Ashbi VPS (187.77.26.99). One Coolify project per service:
- `calisthenicstree-web` — Vite static build, served by Caddy in-container
- `calisthenicstree-api` — FastAPI on Python 3.12, talks to Postgres over the Docker network
- `calisthenicstree-db` — Postgres 16, volume-mounted for daily backups

**Domain:** `calisthenics-tree.com` (already purchased). DNS via Cloudflare proxy → VPS Caddy → Coolify. SSL terminates at Caddy.

**CI/CD:** GitHub Actions on push to main → rsync to VPS → Coolify source-build webhook. ~5 min end-to-end.

**Secrets:** `.env` on VPS only, never in repo. Per Zorva gotcha (memory 2026-06-24): write locally, base64-encode, `ssh ... 'echo BASE64 | base64 -d > .env'`.

**Observability:** Sentry free tier for FastAPI + frontend errors. UptimeRobot free tier for 5-min uptime check on `/healthz`. PostHog Cloud for product analytics.

**Backups:** Coolify daily snapshot of `calisthenicstree-db` volume. `pg_dump` cron nightly to `/opt/backups/calisthenicstree/` with 7-day rotation.

**Backout:** Coolify project rollback (one-click to previous deploy). Postgres restore from `pg_dump` if schema migration goes bad. Both in `RUNBOOK.md`.

## Decision rules for downstream agents

- Phase 1 backend work is **indifferent** to the differentiation choice (Path B). Schema serves A/B/C.
- Phase 2 UI work assumes Path B. Don't add social-feed UI without re-reading this plan.
- Pricing is **$5.99/$29.99/$99**, not the $4.99/$39.99 originally planned. Update any task body that referenced the old numbers.
- App name is **Calisthenics Tree** (with hyphen in domain, two words in store listing). NOT Calisteniapp.
- Don't widen parent toolsets in `~/.hermes/config.yaml` — pass `toolsets=['web','file','terminal']` explicitly per delegate_task batch instead.

## Research index

- `/tmp/research/competitive-audit.md` — 7 competitors in DAG/skill-tree space, Calistree is the 5-year incumbent
- `/tmp/research/healthkit-review-process.md` — App Store 5.1.1/1.4.1/2.5.1 scrutiny, 3-7 day first submission
- `/tmp/research/watchos-detection-limits.md` — auto-detect impossible, tap-to-start is the v1 answer
- `/tmp/research/pricing-model.md` — $5.99/$29.99/$99 ladder, $4.99 anchor is too thin for paid UA
- `/tmp/research/analytics-stack.md` — PostHog Cloud wins for solo-founder fitness app at 1M events/mo
- `/tmp/research/app-store-category.md` — Health & Fitness primary, Social Networking secondary
- `/tmp/research/app-name-conflict-check.md` — Calisteniapp is a live competitor, pivot to Calisthenics Tree
- `/tmp/research/hevy-user-switching.md` — top churn reasons, switch triggers, retention benchmarks

## Task graph

Seeded in kanban board `calisthenics-platform`: 33 cards across P0-P6 with task IDs T1-T33. Parents enforce phase ordering. Solo-dev default: leave ready tasks unassigned, don't auto-dispatch.