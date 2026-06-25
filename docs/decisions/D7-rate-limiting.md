# D7 — Rate limiting strategy

Status: **DRAFT — needs decision before Phase 1**

## Decision
**Per-IP AND per-user rate limits** via `slowapi` (FastAPI middleware). Different limits per endpoint category. 429 responses with `Retry-After` header.

## Limits

| Endpoint | Per-IP | Per-user | Window |
|---|---|---|---|
| `POST /auth/magic-link/request` | 10 | — | 1 hour |
| `POST /auth/apple` | 30 | — | 1 hour |
| `POST /workouts/sync` | — | 60 | 1 minute |
| `POST /workouts/:id/sets` | — | 30 | 1 minute |
| `GET /api/v1/share/:id.png` | 60 | — | 1 minute |
| All other authenticated endpoints | — | 300 | 1 minute |
| All unauthenticated reads | 60 | — | 1 minute |

## Why these numbers

- **Magic-link request at 10/hour per IP** — generous enough for a misclick-spamming user, low enough that an attacker can't burn our Postmark quota.
- **Apple auth at 30/hour per IP** — Apple Sign-In is fast and reliable, this catches credential-stuffing attempts.
- **Workout sync at 60/minute per user** — even a fast typer logging 5 sets/minute is well under this. The cap exists to catch runaway scripts.
- **Share card at 60/minute per IP** — covers a feed-scraper, blocks bulk image theft.

## Storage

Rate limit counters in Redis (Coolify-managed Redis container). Fall back to in-memory if Redis is down (fail open, log warning).

## What gets blocked vs throttled

- **Blocked**: exceeds 2x the limit. Returns 429 with `Retry-After: 3600`.
- **Throttled**: exceeds the limit. Returns 429 with `Retry-After` proportional to the window.

## Action
T6 (endpoints) implements via `slowapi`. Redis container added to Coolify project in T1.