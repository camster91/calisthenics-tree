# D9 — Background jobs

Status: **DRAFT — needs decision before Phase 1**

## Decision
**arq** (asyncio-native Redis queue) for everything that doesn't need to complete in the request/response cycle. Cron jobs via the OS cron or arq's cron support.

## Jobs in v1

| Job | Schedule | What it does |
|---|---|---|
| `tendon_strain_recalculate` | Every 6 hours per user who logged a workout in the last 7 days | Recompute S_tendon rolling 4-week average + deload threshold check |
| `send_weekly_summary_email` | Sundays at 6pm user-local time | Email user their week's unlocks, total volume, tendon strain status |
| `send_deload_alert_push` | Triggered by `tendon_strain_recalculate` finding a deload | Push notification with the regression recommendation |
| `send_friend_unlock_push` | Triggered by social event | Push notification when an accepted friend unlocks a node |
| `cleanup_unverified_users` | Daily at 3am UTC | Delete accounts that signed up but never completed onboarding, after 14 days |
| `cleanup_orphaned_share_cards` | Daily at 4am UTC | Delete share PNGs older than 90 days for users who deleted their account |
| `pg_dump` | Daily at 2am UTC | Backup Postgres to /opt/backups/calisthenicstree/, rotate 7-day retention |
| `coolify_snapshot` | Daily at 1am UTC | Coolify-level snapshot of the calisthenicstree-db volume |

## Architecture

```
api/app/jobs/
  tendon.py        # arq worker function
  email.py
  push.py
  cleanup.py

worker.py          # arq WorkerSettings, imports all job functions
                   # deployed as separate Coolify service: calisthenicstree-worker
```

The worker is a separate Coolify service consuming the same Docker image as the API but with a different entrypoint (`python -m api.worker` instead of `uvicorn api.app.main:app`).

## Why arq over alternatives

- **Celery**: heavyweight, separate broker config, sync-only by default. Overkill at v1 scale.
- **RQ**: sync-only, no async. Same issue.
- **FastAPI BackgroundTasks**: only works inside the request lifecycle. Dies when the request ends. Useless for "recalc tendon in 6h".
- **arq**: asyncio-native, Redis-only (we already have Redis for D7), minimal config, supports cron via `cron_jobs` in WorkerSettings.

## Failure handling

- Failed jobs retry 3 times with exponential backoff (1s, 10s, 100s).
- After 3 failures, job goes to `dead_letter` Redis list. Operator reviews via `hermes kanban claim` (we use the kanban as our dead-letter dashboard) or a simple CLI tool.

## Action
T1 (scaffold) adds the `worker.py` skeleton + Redis container. Background jobs implemented as their associated features land (tendon job in T5, email job in T8, push job in T18).