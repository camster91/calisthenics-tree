# Calisthenics Tree

Calisthenics skill-tree progression tracker. Train smarter — not just harder.

> **One-liner:** A real skill tree for calisthenics. Unlock planche, front
> lever, handstand — progression that makes sense, with smart regressions
> when you fatigue.

## Start here

1. **[`docs/PLAN.md`](docs/PLAN.md)** — master build plan. Locked decisions, 6 phases (P1 → P6), deploy/infra, kill criteria, research index.
2. **[`docs/decisions/`](docs/decisions/)** — 20 pre-Phase-1 polish decisions (D1 = Postgres hosting, D20 = admin tools). Read before writing code.
3. **[`docs/research/`](docs/research/)** — 8 research reports (competitive audit, HealthKit review, watchOS limits, pricing model, analytics stack, App Store category, name conflict, Hevy user switching).
4. **[`SCREEN_INVENTORY.md`](SCREEN_INVENTORY.md)** — every v1 screen, states, routes.
5. **Code, organized by phase.**

## Stack

- **api/** — FastAPI on Python 3.12, SQLAlchemy 2.0 async + asyncpg,
  Postgres 16, Alembic migrations. Bearer-token auth. (Phase 1 — done.)
- **apps/web** — React 19 + Vite 8 + Tailwind v4 + TypeScript. Phase 1.5
  design-system scaffold (this commit).

## Repo layout

```
calisthenics-tree/
├── apps/
│   ├── api/                       # FastAPI backend (Phase 1)
│   │   ├── calisthenics_api/      # routes, schemas, models, db, auth
│   │   ├── alembic/               # DB migrations (seeds 30 nodes, 3 trees)
│   │   ├── tests/                 # pytest + httpx
│   │   └── Dockerfile
│   └── web/                       # Vite + React frontend (Phase 1.5+)
│       ├── src/
│       │   ├── tokens.ts          # design tokens (single source of truth)
│       │   ├── index.css          # Tailwind v4 @theme + base + utilities
│       │   ├── lib/               # cn, api client, theme provider
│       │   ├── components/        # layout/, ui/, workout/, dag/
│       │   └── pages/             # route components (HomePage, etc.)
│       ├── wireframes/            # Playwright screenshots of low-fi wireframes
│       └── public/                # static assets (icons, favicon, share cards)
├── docs/
│   ├── PLAN.md                    # master build plan — read this first
│   ├── decisions/                 # 20 pre-Phase-1 decisions (D1-D20)
│   └── research/                  # 8 research reports
├── scripts/                       # screenshot-wireframes.mjs
├── docker-compose.yml             # local dev (postgres + api)
└── .gitignore
```

## Local development

### Backend

```bash
docker compose up -d db          # postgres
docker compose up api            # uvicorn on :8000 (or run via pyproject.toml)
curl http://localhost:8000/healthz
```

Apply migrations + seed data:

```bash
cd apps/api && uv run alembic upgrade head
```

### Frontend

```bash
cd apps/web
npm install
npm run dev                      # vite dev server on :5173
npm run build                    # production build → dist/
```

The dev server proxies `/api` to `http://localhost:8000` (configure in
`vite.config.ts` — TODO for Phase 2). Without the proxy running, the home
page shows a clear error from `/healthz` so you know the API isn't up.

### Environment variables

`apps/web/.env.local` (optional):
```
VITE_API_URL=http://localhost:8000
VITE_API_TOKEN=dev-bearer-token-replace-me
```

## Phase plan

| Phase | Status | Scope |
|---|---|---|
| **P1** Backend | Done | Schema, DAG engine, promotion function, auth, /healthz |
| **P1.5** Brand + UX system | **In progress** | Tokens, components, wireframes, accessibility, gym-glare variant, app icon, screenshots |
| **P2** Web app | Pending | Full React app — onboarding, DAG browse, workout log, social feed, settings, paywall |
| **P3** Marketing | Pending | Landing page, programmatic SEO, OG images |
| **P4** Mobile | Pending | Capacitor wrap, App Store + Play Store submission |
| **P5** Beta + launch | Pending | TestFlight, 100 signups / 14d target, paid UA |

See [`docs/PLAN.md`](docs/PLAN.md) for the full per-task breakdown,
deploy/infra/ops decisions, and locked scope rules.

## Design system

Frontend tokens live in [`apps/web/src/tokens.ts`](apps/web/src/tokens.ts).
Tailwind v4 consumes them via the `@theme { ... }` block in
[`apps/web/src/index.css`](apps/web/src/index.css).

Two themes:

- **default** — dark by default (sweat-proof, doc2). WCAG AA contrast.
- **gym-glare** — high-contrast, AAA. Auto-detects
  `prefers-contrast: more`; manual toggle coming in Settings (T38).

## License

TBD (private — commercial app).
