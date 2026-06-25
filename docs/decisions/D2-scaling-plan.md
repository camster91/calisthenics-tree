# D2 — Scaling plan (1k / 10k / 100k MAU tier model)

Status: **LOCKED — 2026-06-25** (review at 10k MAU trigger)
Owner: Cameron (solo)
Source: plan lines 231-248 + Coolify-on-single-VPS gotcha (memory 2026-06-24)

## Question

What breaks first at each user tier, and which v1 architectural choices
enable vs. foreclose scaling? Plan calls scaling a "future problem," but
v1 choices either unlock or lock the path. This doc names both sets
explicitly so the next agent reading the codebase knows which constraints
were deliberate and which were "we never got around to it."

## Tier model

### 1k MAU — launch window

- **API:** single FastAPI worker, 1 vCPU / 1 GB RAM.
- **DB:** Postgres 16, 2 vCPU / 4 GB RAM, same Coolify project as API.
- **Static assets:** served by the Coolify web container (Caddy), no CDN.
- **Share cards:** rendered on-demand via Playwright, cached to disk.
  ~50 cards/day at 1k MAU is fine.
- **Auth:** JWT, no server-side sessions, no Redis required.
- **Observability:** Sentry free tier + UptimeRobot on `/healthz`.

**First bottleneck:** Postgres connection count under burst. **Fix:**
pgbouncer in transaction-pooling mode at the Coolify network layer, set
at T1 (scaffold). This is one of the cheapest, highest-leverage adds and
must be in by 1k — not bolted on at 5k.

### 10k MAU — paid-UA growth window

- **API:** 2-4 FastAPI workers behind the Coolify load balancer.
- **DB:** Postgres primary + 1 read replica for analytics queries
  (tendon strain history, retention dashboards, admin reports).
- **Static assets:** Cloudflare CDN in front of Coolify Caddy. DNS is
  already on Cloudflare per plan, so this is a config change, not infra.
- **Share cards:** pre-generate at unlock time, not on-demand. Move to
  **Cloudflare R2** (free egress tier) for global delivery.
- **Background jobs:** **arq** (asyncio-native Redis queue) for tendon
  recalc, weekly summary emails, push notifications. Redis on the same
  VPS is fine at this tier.
- **Rate limiting:** Redis-backed token bucket per user/IP. (See D7.)

**First bottleneck:** API worker count (single VPS, 4 workers max before
we hit CPU contention with Postgres). Background-job contention with API
workers (both want the same CPU).

### 100k MAU — Series-A / "real company" window

- **API:** split into services (auth, progressions, workouts, social)
  behind an API gateway. Possibly Kong, possibly a thin FastAPI gateway.
- **DB:** managed Postgres (Supabase or Crunchy Bridge). Self-hosting
  Postgres at 100k MAU is a full-time job and not the founder's job.
- **Object storage:** Cloudflare R2 + Workers for image processing.
- **WebSocket layer:** separate service (FastAPI WebSocket or managed
  Pusher / Ably).
- **Background jobs:** dedicated worker pool, separate from API pods.
- **Caching:** Redis cluster (or Upstash) for hot-path reads (current
  week of progressions, weekly summary in flight).

**First bottleneck:** coordination cost. Multiple services + managed DB +
Redis + workers = a real SRE surface. Founder can't carry this alone.

## v1 choices that ENABLE scaling

| Choice | Why it scales |
|---|---|
| Async FastAPI + asyncpg | Connection pooling works as-is; no rewrite needed. |
| Stateless API workers | Horizontal scaling is a config change, not a code change. |
| JWT auth, no server-side sessions | No Redis dependency for auth at any tier. |
| Postgres as the only stateful service in v1 | No separate Redis/cache to coordinate until we explicitly add it. |
| Share cards cached to disk, served via HTTP | Easy to swap disk → R2 without changing call sites. |
| Schema-per-feature migrations (D6) | Each service-extraction at 100k only carries its slice. |
| API versioning from day 1 (D3) | URL-prefix versioning means v2 routes can run side-by-side with v1 during cutover. |
| Background jobs as a separate worker process | At 10k we scale workers independently of API. |

## v1 choices that FORECLOSE scaling (and the trigger to migrate)

| Choice | What it forecloses | Migration trigger |
|---|---|---|
| **Coolify on a single VPS** (no HA) | One box dies = full outage. No failover. | At **10k MAU** or any paid-UA campaign above $500/mo, move DB to managed Postgres with HA. API can stay single-VPS until 100k if HA DB is in. |
| **Postgres on same VPS as API** | Network latency fine at 10k, painful at 100k. CPU contention at 10k+ if both are hot. | At **10k MAU**, split DB to its own VPS or managed Postgres. |
| **pgbouncer assumed, not required** | App connects straight to Postgres if pgbouncer is misconfigured. | At **5k MAU**, make pgbouncer mandatory in docker-compose + CI check that app uses 6432, not 5432. |
| **No background-job isolation** | All async work in the API process. API and jobs fight for CPU. | At **5k MAU**, stand up Redis + arq worker process on the same VPS. |
| **Share cards on local disk** | Can't serve share cards across multiple API workers (sticky session needed) or globally (latency). | At **10k MAU**, move to R2. |
| **Single FastAPI process** | Can't scale API independently of jobs/DB. | At **10k MAU**, run 2-4 FastAPI replicas behind Coolify LB. |
| **SQLite for local dev** | Drift risk if devs use SQLite-only features (e.g., JSON1 quirks). | **Always** — production is Postgres; CI runs integration tests against Postgres, not SQLite. SQLite is dev convenience only. |
| **No read replica** | Analytics queries compete with transactional traffic. | At **10k MAU**, add read replica for analytics. |
| **API gateway implicit (just FastAPI routes)** | At 100k, gateway features (rate limit, auth, routing) need to live in a real gateway. | At **100k MAU**, introduce Kong or thin gateway. |
| **Caddy as CDN** | No edge cache, no global PoPs. | At **10k MAU**, Cloudflare CDN in front. Caddy becomes origin. |

## Migration triggers — single table

| When MAU hits | Move off | Onto |
|---|---|---|
| **1k** (now) | nothing — this is launch | pgbouncer required |
| **5k** | app talking directly to Postgres | app → pgbouncer → Postgres (enforced) |
| **5k** | background jobs in API process | Redis + arq worker |
| **10k** | single FastAPI worker | 2-4 FastAPI replicas behind Coolify LB |
| **10k** | Caddy as CDN | Cloudflare CDN in front, Caddy as origin |
| **10k** | share cards on local disk | Cloudflare R2 |
| **10k** | Postgres on API VPS | dedicated DB VPS or managed Postgres |
| **10k** | single Postgres | primary + read replica |
| **100k** | single Coolify project per service | multi-service split behind gateway |
| **100k** | self-hosted Postgres | managed (Supabase / Crunchy Bridge) |
| **100k** | single API binary | per-domain services (auth / progressions / workouts / social) |

The numbers are conservative. Move earlier if a paid-UA campaign is
running and downtime costs real money; move later if organic growth is
slow and infra cost is the constraint.

## What v1 deliberately does NOT do

- **No Redis at v1.** Adding it just to have it is one more thing to
  back up and one more thing to break. Comes in at 5k MAU.
- **No CDN at v1.** Caddy + same-region users is fine for 1k MAU.
  Comes in at 10k.
- **No read replica at v1.** Single Postgres handles 1k MAU easily.
  Comes in at 10k.
- **No API gateway at v1.** FastAPI itself is the gateway. Comes in at
  100k.
- **No HA at v1.** Single VPS = single point of failure. Acceptable
  for launch; mandatory migration at 10k.

These are deliberate, not "we forgot."

## RUNBOOK hooks

The migration triggers above must be added to `RUNBOOK.md` as runbook
entries. Each trigger = one runbook page: "how to move from X to Y."

- "Move DB to dedicated VPS / managed Postgres"
- "Add Cloudflare CDN in front of Caddy"
- "Move share cards to R2"
- "Add Redis + arq worker"
- "Split API into per-domain services"

## Action

- T1 (scaffold) includes pgbouncer in docker-compose and CI.
- T1-T7 implement the v1 choices above.
- RUNBOOK.md gets the 5 migration runbook pages before T35 (beta).
- Re-review this doc at 5k MAU and at 10k MAU. Trigger thresholds move
  down, not up, if the team grows.

## Decision log

- 2026-06-25: LOCKED at v1 numbers above. Next review at 5k MAU.
