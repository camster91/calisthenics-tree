# D8 — Caching strategy

Status: **DRAFT — needs decision before Phase 1**

## Decision
**Three layers of caching**, in order of invalidation frequency:

1. **HTTP cache headers** (browser/CDN) — for static data the client can re-fetch.
2. **In-memory LRU** (per-API-worker) — for hot paths in the same process.
3. **Redis** — for shared state across workers.

No cache layer in v1 for user-specific data. Caching user progressions is the kind of optimization that bites you the moment a node unlocks and the user sees stale data.

## Cache map

| Data | Layer | TTL | Invalidation |
|---|---|---|---|
| Static assets (JS, CSS, fonts) | Browser + CDN | 1 year | Content-hashed filenames |
| Exercise list (all exercises) | Browser + CDN | 1 hour | New exercise added → bump CDN cache |
| Progression tree (all 3 trees) | Browser + CDN | 1 hour | New node added → bump CDN cache |
| Progression node by ID | HTTP cache header `Cache-Control: public, max-age=300` | 5 min | None — nodes rarely change |
| User's active progressions | None in v1 | — | Always fresh from DB |
| Tendon strain view | None in v1 | — | Always fresh |
| Share card PNG | Disk cache (`apps/web/public/share/<id>.png`) | Forever | Regeneration is idempotent |
| Auth: rate limit counters | Redis | Per window | TTL = window length |
| Auth: magic-link token | Redis | 24h | Expires naturally |

## Why no user-data caching

Three reasons:
1. **Correctness.** A user unlocks a new node → cache miss → sees stale state → reports a bug → we debug a non-bug.
2. **Invalidation is hard.** Postgres triggers + cache eviction + race conditions = subtle bugs.
3. **Scale is not the bottleneck.** Postgres can serve 10k user-progression reads/sec from a 2-CPU box. We'll hit the cache eviction bug before we hit the read-throughput ceiling.

## What this enables

At 10k MAU with peak 500 concurrent users:
- 500 user-progression reads/sec hitting Postgres. Trivial.
- 5-10 share card renders/minute from disk cache. Trivial.
- Magic-link + rate-limit traffic on Redis. Trivial.

## What this forecloses

- Sub-100ms latency for the home screen. Acceptable for v1.
- "I unlocked a node and my friend sees it instantly." That's Phase 4+ with WebSocket fan-out (D11).

## Action
T1 (scaffold) adds Redis container. T6 (endpoints) implements rate limiting (D7) and magic-link auth via Redis. No cache layer for user data in v1.