# Calisthenics Tree

Calisthenics skill-tree progression tracker. Train smarter — not just harder.

> **One-liner:** A real skill tree for calisthenics. Unlock planche, front
> lever, handstand — progression that makes sense, with smart regressions
> when you fatigue.

**Live:** [calisthenics-tree.com](https://calisthenics-tree.com) (when deployed)

## What's here

- **Full P1 backend** — FastAPI + SQLAlchemy 2.0 async + Postgres 16, magic-link auth with JWT, DAG engine, placement algorithm, tendon strain calculator, `/api/v1/...` endpoints
- **Full P1.5 design system** — design tokens (default + gym-glare themes), 18+ shadcn-style UI components, 8 workout components, gym-glare toggle in Settings, App Store screenshot assets
- **Full P2 web app** — React 19 + Vite + Tailwind v4, public landing, magic-link login, 4-screen onboarding, DAG browser, workout log with timer/rep counter, tendon strain insights, settings + sign-out
- **Public marketing surface** — `/welcome`, `/privacy`, `/terms`
- **Production deploy plumbing** — multi-stage Dockerfiles (api + web), local + production compose files, Caddy reverse-proxy with env-driven TLS

## Stack

- **apps/api/** — FastAPI on Python 3.12, SQLAlchemy 2.0 async + asyncpg, Postgres 16, Alembic. PyJWT for token signing, itsdangerous for magic-link tokens, sentry-sdk for error tracking.
- **apps/web/** — React 19 + Vite 8 + Tailwind v4 + TypeScript. shadcn-style primitives, dagre for DAG layout, i18next for i18n, PostHog for analytics.
- **docs/** — master plan (`PLAN.md`), 20 decision docs, 8 research reports, ops runbook (`RUNBOOK.md`).

## Repo layout

```
calisthenics-tree/
├── apps/
│   ├── api/                                # FastAPI backend
│   │   ├── calisthenics_api/               # routes, schemas, models, db, auth, security, tendon, placement
│   │   ├── alembic/                        # DB migrations (seeds 30 nodes, 3 trees)
│   │   ├── tests/                          # pytest + httpx
│   │   ├── Dockerfile                      # multi-stage python:3.12-slim
│   │   └── pyproject.toml
│   └── web/                                # Vite + React frontend
│       ├── src/
│       │   ├── tokens.ts                   # design tokens (single source of truth)
│       │   ├── index.css                   # Tailwind v4 @theme + base + utilities
│       │   ├── lib/                        # cn, api client, auth context, theme, analytics, i18n
│       │   ├── components/                 # layout/, ui/, workout/
│       │   └── pages/                      # HomePage, LoginPage, Onboarding*, Workout*, Tree, Insights, Settings, Landing, Privacy, Terms
│       ├── Dockerfile                      # multi-stage node:20-alpine → caddy:2-alpine
│       ├── Caddyfile                       # /api → api:8000 reverse-proxy + SPA fallback
│       ├── wireframes/                     # Playwright screenshots of low-fi wireframes
│       └── public/                         # static assets (icons, favicon, share cards)
├── docs/
│   ├── PLAN.md                             # master build plan
│   ├── decisions/                          # 20 pre-Phase-1 decisions (D1-D20)
│   ├── research/                           # 8 research reports
├── ARCHITECTURE.md                         # backend module layout + DB schema + API surface + algorithms
├── DECISION.md                            # kill criteria + scope rules + locked decisions
├── REVIEW.md                              # sprint-by-sprint review + follow-up backlog
├── RUNBOOK.md                             # deploy + rollback + backups + incident response
├── SEED_DATA.md                           # 3 trees × 10 nodes inventory + edge topology
├── SCREEN_INVENTORY.md                    # every v1 screen with states
├── docker-compose.yml                     # local dev (db port exposed, bind mounts, plain HTTP)
├── docker-compose.prod.yml                # production (no db port, named volumes, TLS + resource limits)
└── .gitignore
```

## Local development

### Backend

```bash
docker compose up -d db          # postgres on :5433
docker compose up api            # uvicorn on :8000
curl http://localhost:8000/healthz
```

Apply migrations + seed data:

```bash
cd apps/api && uv sync --extra dev && uv run alembic upgrade head
```

Run tests:

```bash
cd apps/api && uv run pytest tests/ -q   # 55 passed, 25 skipped (DB-gated)
```

### Frontend

```bash
cd apps/web
npm install                       # postinstall runs `theme:build`
npm run dev                       # vite dev server on :5173 (proxies /api → :8000)
npm run build                     # production build → dist/
```

The Vite dev server proxies `/api`, `/share`, `/auth/*` to the backend on
:8000. Frontend a11y tests:

```bash
cd apps/web && npx playwright test tests/a11y/   # 10/10 pass
```

### Environment variables

Copy `apps/api/.env.example` → `apps/api/.env` and fill in the real values:

```bash
# Required in production:
JWT_SECRET=...                  # python -c "import secrets; print(secrets.token_urlsafe(64))"
MAGIC_LINK_SECRET=...           # same
BEARER_TOKEN=...                # dev-only static token (Phase 1 compat)
POSTGRES_PASSWORD=...
POSTMARK_TOKEN=...              # if real email; unset = dev-mode (link logged)
SENTRY_DSN=...                  # if error tracking; unset = no-op

# Web (apps/web/.env.local):
VITE_API_URL=/api
VITE_API_TOKEN=dev-bearer-token-replace-me    # dev only
VITE_POSTHOG_API_KEY=...                      # if analytics; unset = no-op
```

## Deployment

Production uses `docker-compose.prod.yml` — three services (`db`, `api`,
`web`) on the same Docker network, with Caddy in the web container
handling reverse-proxy + ACME TLS via env-driven mode switch.

Local dev uses `docker-compose.yml` — same topology but with the db
port exposed (5433) for local Postgres tools, share-cards mounted as
a bind mount so host re-renders show up live, and Caddy in plain
HTTP mode (no ACME).

For step-by-step deploy + rollback + backups, see [`RUNBOOK.md`](RUNBOOK.md).
For the production env shape, see [`docker-compose.prod.yml`](docker-compose.prod.yml).

## Architecture

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for:
- System overview + module layout
- DB schema (all tables + relationships + `check_node_unlock_status` PL/pgSQL function)
- API surface (every route from `main.py`)
- Key algorithms (placement, promotion, regression, tendon strain)
- Request lifecycle (end-to-end workout log flow)
- Frontend integration (auth, API client, auto-refresh on 401)

## Decisions + scope

See [`DECISION.md`](DECISION.md) for:
- Locked decisions (differentiation = Path B, hosting = Coolify, pricing, etc.)
- Kill criteria (Month 3 / 6 / 12 thresholds)
- Anti-features (don't build: CV form check, native Android until $500 MRR, etc.)

See [`docs/decisions/`](docs/decisions/) for the 20 detailed decision docs.

## Phase plan

| Phase | Status | Scope |
|---|---|---|
| **P1** Backend | **Done** | Schema, DAG engine, placement, magic-link auth, JWT, tendon strain |
| **P1.5** Design system | **Done** | Tokens, components, wireframes, accessibility (10/10 a11y), gym-glare variant, app icon, screenshots |
| **P2** Web app | **Done (core)** | Login, onboarding, DAG browse, workout log, settings, sign-out, insights |
| **P3** Marketing | **Done (entry surface)** | Welcome, privacy, terms; programmatic SEO per-node pages is P3+ |
| **P4** Mobile | Pending | Capacitor wrap, HealthKit, watch companion, App Store submission |
| **P5** Monetization + launch | Pending | StoreKit 2 paywall, App Store review, Reddit launch |

See [`docs/PLAN.md`](docs/PLAN.md) and [`REVIEW.md`](REVIEW.md) for the full
breakdown + sprint-by-sprint status.

## Testing

```bash
# Backend (requires Postgres up for the 25 DB-gated tests)
cd apps/api && uv run pytest tests/ -q

# Frontend a11y (10 specs)
cd apps/web && npx playwright test tests/a11y/
```

## License

TBD (private — commercial app).