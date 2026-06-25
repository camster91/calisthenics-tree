# D6 — Database migration policy

Status: **DRAFT — needs decision before Phase 1**

## Decision
**Alembic**, forward-only migrations, applied at deploy time. No online schema changes without a migration script.

## Rules

1. **One migration per PR.** Never bundle multiple schema changes in one migration.
2. **Forward-only.** No down-migrations. If you break prod, write a new forward migration that fixes it.
3. **Migrations run before the new app version serves traffic.** Deploy order: stop old API → run migrations → start new API. Coolify's source-build webhook handles this with `migrate.sh` as a pre-start hook.
4. **Migrations are tested in CI.** A GitHub Actions job spins up Postgres + runs `alembic upgrade head` against an empty DB + against a DB seeded with the latest backup. Both must succeed.
5. **Migrations are reversible in 5 minutes.** If a migration takes longer than 5 minutes, it must be split into smaller migrations OR run as a background data migration (separate from schema migration).

## File structure

```
apps/api/
  alembic/
    env.py
    versions/
      2026_06_25_001_initial.py
      2026_06_30_002_progression_edges.py
      ...
  alembic.ini
```

## Naming convention

`YYYY_MM_DD_NNN_short_description.py` where NNN is a zero-padded sequence number for that day. Example: `2026_06_30_002_progression_edges.py`.

## Dangerous operations

These require explicit review + a backup before applying:

- `DROP TABLE` — never happens in v1. If we ever need it, write a forward migration that copies data, drops the old table, renames the new one.
- `ALTER TABLE ... ALTER COLUMN TYPE` — locks the table. Use `ALTER TABLE ... ADD COLUMN ... DEFAULT ...` + backfill + `ALTER COLUMN DROP DEFAULT` instead.
- Adding a NOT NULL column without DEFAULT — fails on existing rows. Always provide a DEFAULT.

## Action
T1 (scaffold) sets up Alembic. T2 (initial schema) writes the first migration. Document in `docs/decisions/migrations.md` (this file, when finalized).