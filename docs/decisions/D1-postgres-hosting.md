# D1 — Postgres hosting details

Status: **DRAFT — needs decision before Phase 1**

## Question
What specifically are we running, on what version, with what resource limits, backup policy, and disaster recovery story?

## Options

| Component | Decision needed |
|---|---|
| Coolify version | Pin to current LTS (v4.x as of 2026-06) |
| Reverse proxy in Coolify | Traefik (default) vs Caddy — Traefik is the Coolify default, leave it |
| Postgres version | 16.x — current stable, JSON perf wins, no upgrade tax for 5+ years |
| Container resource limits | API: 1 CPU / 1GB RAM. DB: 2 CPU / 4GB RAM. Tweak after observing load. |
| Storage | VPS local volume for now; flag for migration at 100GB+ usage |
| Backup policy | Coolify daily snapshot of calisthenicstree-db volume + nightly `pg_dump` cron to /opt/backups/calisthenicstree/ with 7-day rotation |
| Point-in-time recovery | **No** — daily snapshots only. Accept data loss window of <24h. PITR is $20/mo on managed Postgres, not worth it at $0 MRR. |
| DR plan if VPS dies | **None** at v1. Single point of failure on the VPS. Document in RUNBOOK.md. Cross-that-bridge at $500 MRR. |
| Migration path | If we outgrow VPS Postgres: Supabase ($25/mo managed) or Crunchy Bridge ($50/mo). Both import from `pg_dump`. |

## Action
T1 (scaffold monorepo) implements these defaults. Document overrides in `docs/decisions/postgres-hosting.md` (this file, when finalized).

## Open question
Is "single point of failure on the VPS" acceptable for v1? My read: yes, given zero MRR and the time cost of multi-region or managed Postgres setup. Worst case at month 1 is losing a week of user data and rebuilding from snapshot. That's a 2-day recovery, not a project killer.