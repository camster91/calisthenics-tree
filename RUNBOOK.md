# RUNBOOK

> For Cameron, at 2am, with an outage. Terse. Copy-pasteable.
>
> Last updated: 2026-06-25

---

## 1. Architecture overview

All production traffic flows: **Cloudflare (DNS proxy + DDoS) → Caddy (SSL termination, reverse proxy on the VPS) → Coolify (orchestrator) → one of three services**: `calisthenicstree-web` (Vite static build served by Caddy in-container), `calisthenicstree-api` (FastAPI on Python 3.12, talks to Postgres over the internal Docker network), `calisthenicstree-db` (Postgres 16, volume-mounted for backups). Everything runs on a single VPS (Ashbi, `187.77.26.99`) under Coolify. Domain is `calisthenics-tree.com`. Background jobs (arq worker) consume the same API Docker image with a different entrypoint. Redis is provisioned inside the db service's Coolify project (see D9).

```
        ┌─────────────┐    ┌────────────┐    ┌──────────────────────┐
 user → │ Cloudflare  │ →  │  Caddy     │ →  │      Coolify         │
        │ (DNS+proxy) │    │  (SSL/443) │    │ ┌──────┬───────┬───┐ │
        └─────────────┘    └────────────┘    │ │ web  │  api  │db │ │
                                             │ │Caddy │FastAPI│pg │ │
                                             │ └──────┴───┬───┴───┘ │
                                             │            │ Docker │
                                             │            │ network │
                                             └────────────┼────────┘
                                                          ▼
                                              /opt/backups/calisthenicstree/
```

---

## 2. First-time deploy (fresh VPS)

Assumes you have a brand-new VPS with SSH access and the domain already pointed at Cloudflare.

1. **Provision VPS** — Hetzner/Contabo/DO, Ubuntu 22.04 LTS, 4 vCPU / 8GB RAM minimum. Save the SSH key.

2. **Point DNS at Cloudflare**
   - Add `calisthenics-tree.com` to Cloudflare (free tier).
   - Add A record: `@` → `187.77.26.99`, proxy **ON** (orange cloud).
   - Add A record: `www` → `187.77.26.99`, proxy **ON**.
   - SSL/TLS mode: **Full (strict)**.
   - Cache level: **Standard**. Development tier.

3. **Install Coolify on the VPS**

   ```bash
   ssh root@187.77.26.99
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```

   - Open `http://187.77.26.99:8000`, register the admin user.
   - Settings → Server → set the VPS's public FQDN.

4. **Link the domain to Coolify**
   - Coolify → Settings → FQDN: `https://coolify.calisthenics-tree.com` (Cloudflare proxy in front).
   - In Cloudflare, add a CNAME or A record for `coolify` → `187.77.26.99` (or use the dynamic domain token Coolify provides).

5. **Create 3 Coolify projects** (Projects → New Project):
   - `calisthenicstree-web`
   - `calisthenicstree-api`
   - `calisthenicstree-db`

6. **Add the Postgres service**
   - In `calisthenicstree-db` project → Add Resource → Database → `postgres:16-alpine`.
   - Persist volume at `/var/lib/postgresql/data` (Coolify defaults to a named volume; keep it).
   - Set env vars: `POSTGRES_USER=calisthenics`, `POSTGRES_PASSWORD=<generate-32-chars>`, `POSTGRES_DB=calisthenics`.
   - Set `DATABASE_URL` secret in the API project later (see step 7).

7. **Deploy the API** (`calisthenicstree-api` project)
   - Add Resource → Application → Public/Private GitHub repo → branch `main`.
   - Build pack: **Dockerfile**. Coolify will source-build.
   - Base directory: `/` (repo root). Dockerfile path: `apps/api/Dockerfile`.
   - Port: `8000`. Healthcheck path: `/healthz`.
   - Environment variables — copy from `apps/api/.env.example` and fill in:
     ```
     DATABASE_URL=postgresql+asyncpg://calisthenics:<password>@calisthenicstree-db:5432/calisthenics
     BEARER_TOKEN=<32-char-secret>
     ENVIRONMENT=production
     SENTRY_DSN=<from-sentry-project-settings>
     POSTHOG_API_KEY=<from-posthog-project>
     POSTMARK_TOKEN=<from-postmark>
     ```
   - Persistent volume (optional): `/data/uploads` for share cards.
   - Pre-start command (Coolify → App → Advanced → Pre-start):
     ```bash
     alembic upgrade head
     ```
   - Deploy. Wait for `Running`.

8. **Deploy the Web** (`calisthenicstree-web` project)
   - Add Resource → Application → same GitHub repo, branch `main`.
   - Build pack: **Dockerfile**. Dockerfile path: `apps/web/Dockerfile` (or a static buildpack if the web app ships plain static — confirm `apps/web/package.json` build output).
   - Port: `80` (Caddy in-container).
   - Env: `VITE_API_BASE=https://api.calisthenics-tree.com` (build-time).
   - Add a Caddy reverse-proxy rule so `https://calisthenics-tree.com/api/*` → `http://calisthenicstree-api:8000/*`.

9. **DNS → Caddy routing**
   - In Cloudflare, point `api.calisthenics-tree.com` → `187.77.26.99` (proxy ON).
   - Coolify generates Let's Encrypt certs automatically for both domains.

10. **Smoke test**

    ```bash
    curl -i https://calisthenics-tree.com/healthz
    # expect: HTTP/2 200, body {"status":"ok"}

    curl -i https://api.calisthenics-tree.com/api/v1/users/me/progressions \
      -H "Authorization: Bearer $BEARER_TOKEN"
    # expect: HTTP/2 200
    ```

---

## 3. Day-to-day deploy

The normal flow when pushing to `main`. End-to-end ~5 minutes.

### With GitHub Actions (recommended)

1. Merge PR → push to `main`.
2. GitHub Actions workflow (`.github/workflows/deploy.yml`) rsyncs the repo to `/opt/calisthenics-tree/` on the VPS.
3. Workflow hits the Coolify source-build webhook for each service.
4. Coolify pulls the latest code, builds a fresh image, and runs:
   ```bash
   alembic upgrade head       # pre-start hook on the API container
   uvicorn calisthenics_api.main:app --host 0.0.0.0 --port 8000
   ```
5. Old API container is stopped **before** the new one starts — migrations complete before traffic is served. (Per D6, this is the only safe order.)

### Without Actions (manual)

```bash
ssh root@187.77.26.99
cd /opt/calisthenics-tree
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

Then trigger a manual rebuild in Coolify's UI for `calisthenicstree-api` so the source-build picks up the change.

### Verification

```bash
curl -fsS https://calisthenics-tree.com/healthz | jq .
curl -fsS https://api.calisthenics-tree.com/api/v1/users/me/progressions \
  -H "Authorization: Bearer $BEARER_TOKEN" | jq .
```

Watch the Sentry dashboard for new errors over the next 5 minutes.

---

## 4. Rollback

### Bad code (most common)

1. Coolify → `calisthenicstree-api` → **Deployments** tab.
2. Find the last green deploy (typically the one before this one).
3. Click **Redeploy** on that row. One click.
4. Confirm healthcheck returns 200 within 60s:
   ```bash
   curl -fsS https://api.calisthenics-tree.com/healthz
   ```
5. Same drill for `calisthenicstree-web` if it was the front-end change.

The previous container image is kept in Coolify's image cache — no rebuild needed.

### Bad migration

If a migration succeeded but the new code can't run against the new schema (or the migration is the problem), the code rollback above is not enough. You must revert the schema.

1. SSH in: `ssh root@187.77.26.99`.
2. Find the latest backup:
   ```bash
   ls -lht /opt/backups/calisthenicstree/ | head -5
   ```
3. Stop the API (so nothing writes during restore):
   ```bash
   cd /opt/calisthenic-tree
   docker compose -f docker-compose.prod.yml stop api
   ```
4. Restore: see [Backups → Restore](#restore).
5. Roll back the API to the previous image (Coolify → Deployments → Redeploy).
6. Restart: `docker compose -f docker-compose.prod.yml up -d api`.
7. Verify `curl /healthz` then check Sentry for the error rate dropping.

### Bad deploy that won't rollback cleanly

If both the API and DB are wedged together, take the whole site down with a Cloudflare "Under Attack Mode" toggle, then rebuild from a fresh clone on a new VPS — last-resort, see section 9.

---

## 5. Backups

### Schedule

| Job | When | Where | Retention |
|---|---|---|---|
| Coolify volume snapshot | Daily **1:00 UTC** | Coolify's `/data/coolify/backups/` | 7 days |
| `pg_dump` | Daily **2:00 UTC** | `/opt/backups/calisthenicstree/` | 7 days |

### Cron entries (VPS, `/etc/cron.d/calisthenicstree`)

```cron
# Coolify snapshot is configured in Coolify UI; no cron here.
# pg_dump nightly
0 2 * * * root /usr/local/bin/pg_dump_calisthenicstree.sh >> /var/log/pg_dump.log 2>&1
```

### `pg_dump` script (`/usr/local/bin/pg_dump_calisthenicstree.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR=/opt/backups/calisthenicstree
STAMP=$(date -u +%Y%m%d_%H%M%S)
KEEP_DAYS=7

mkdir -p "$BACKUP_DIR"

docker exec calisthenicstree-db pg_dump \
  -U calisthenics \
  -d calisthenics \
  -Fc \
  > "$BACKUP_DIR/calisthenics_${STAMP}.dump"

# Rotate
find "$BACKUP_DIR" -name "calisthenics_*.dump" -mtime +$KEEP_DAYS -delete
```

Make it executable: `chmod +x /usr/local/bin/pg_dump_calisthenicstree.sh`.

### <a id="restore"></a>Restore

```bash
ssh root@187.77.26.99

# 1. Stop the API so nothing writes.
cd /opt/calisthenics-tree
docker compose -f docker-compose.prod.yml stop api

# 2. Pick a backup.
ls -lht /opt/backups/calisthenicstree/
BACKUP=/opt/backups/calisthenicstree/calisthenics_20260625_020001.dump

# 3. Drop and recreate the DB (or use pg_restore with --clean).
docker exec calisthenicstree-db dropdb -U calisthenics calisthenics --if-exists
docker exec calisthenicstree-db createdb -U calisthenics calisthenics

# 4. Restore.
docker exec -i calisthenicstree-db pg_restore \
  -U calisthenics \
  -d calisthenics \
  --no-owner \
  --role=calisthenics \
  < "$BACKUP"
# (If you saved as plain SQL, use: psql -U calisthenics -d calisthenics -f "$BACKUP")

# 5. Restart API.
docker compose -f docker-compose.prod.yml up -d api

# 6. Verify.
curl -fsS https://api.calisthenics-tree.com/healthz
```

### Quarterly restore drill

Pick the second Tuesday of Jan / Apr / Jul / Oct. Add to `crontab -e`:

```cron
# Reminder only — manual run below
0 9 10 1,4,7,10 * root /usr/local/bin/backup_drill_check.sh
```

Procedure:

1. `scp` the latest `.dump` from `/opt/backups/calisthenicstree/` to a sandbox VPS or local Docker.
2. Spin up `postgres:16-alpine`, restore, run smoke queries:
   ```sql
   SELECT count(*) FROM users;
   SELECT count(*) FROM nodes;
   SELECT max(created_at) FROM workouts;
   ```
3. Confirm counts roughly match `SELECT` totals on production.
4. File any restore-time > 5 minutes as an incident — backups aren't real until the drill proves it.

---

## 6. Observability

### Sentry

- Project: `calisthenics-tree-api` (FastAPI), `calisthenics-tree-web` (frontend).
- DSN lives in `.env` on the VPS (`SENTRY_DSN=...`) and in `.env.example` as a placeholder.
- **View recent errors:** https://sentry.io/organizations/calisthenicstree/issues/?project=<id>
- **Alerts:** 5xx error rate > 1% over 5 min → email + SMS (Cameron's phone) — configured in Sentry Alerts.
- **Source maps:** uploaded by Vite build step (`@sentry/vite-plugin`). Verify in Sentry → Settings → Source Maps after every web deploy.

### UptimeRobot

- Free tier, monitor type: HTTPS.
- Endpoint: `https://calisthenics-tree.com/healthz`.
- Interval: **5 minutes**. Timeout: 30s.
- Keyword assertion: response body contains `"status":"ok"`.
- Alert contacts: Cameron email + Cameron SMS (carrier gateway). Pager is overkill at v1.
- Configure at https://uptimerobot.com/dashboard → Add New Monitor.

### PostHog (product analytics)

- Cloud, free 1M events/mo.
- Project API key in `.env` as `POSTHOG_API_KEY`.
- **Funnels:** PostHog → Insights → New Insight → Funnel. Use event `workout_logged` → `node_unlocked` → `share_card_viewed`.
- **Retention:** Insights → Retention. Cohort: users who completed onboarding in last 14 days.

### Postgres logs

```bash
docker logs calisthenicstree-db --tail 200 -f
```

Enable slow query logging (one-time, in Coolify db service env vars):

```
POSTGRES_LOG_MIN_DURATION_STATEMENT=500ms
POSTGRES_LOG_STATEMENT=all
```

---

## 7. Incident response

### 5xx spike

**First 60 seconds:**

1. Check Sentry → top new issue. Read the stack trace.
2. Was there a deploy in the last 10 min? Check Coolify → Deployments.
3. If yes → **rollback** (section 4). Don't debug at 2am.
4. If no deploy → check the API container logs:
   ```bash
   ssh root@187.77.26.99
   docker logs calisthenicstree-api --tail 500 -f
   ```
5. Look for `psycopg.OperationalError`, `ConnectionRefusedError`, OOMKilled.
6. If OOMKilled → restart container, then bump Coolify → App → Resources → Memory limit to 2GB.

### DB connection errors

**First 60 seconds:**

1. Coolify → `calisthenicstree-db` → is the container **Running**?
2. If not running → start it. If it won't start → check `docker logs calisthenicstree-db --tail 200`.
3. If running → check connection from API container:
   ```bash
   docker exec calisthenicstree-api python -c \
     "import asyncio, asyncpg; \
      asyncio.run(asyncpg.connect('$DATABASE_URL'))"
   ```
4. Check Postgres logs for `FATAL: too many connections`:
   ```bash
   docker logs calisthenicstree-db 2>&1 | grep -i 'too many connections'
   ```
5. If exhausted → find idle sessions:
   ```sql
   SELECT pid, usename, application_name, state, query_start
   FROM pg_stat_activity
   WHERE datname = 'calisthenics' AND state = 'idle'
   ORDER BY query_start;
   ```
   Kill the long-idle ones: `SELECT pg_terminate_backend(pid);`
6. Consider raising `max_connections` (default 100) — edit postgresql.conf and bounce the container.

### Slow API (p95 > 1s)

**First 5 minutes:**

1. Sentry → Performance → top transactions. Find the slow endpoint.
2. `docker exec calisthenicstree-db psql -U calisthenics -d calisthenics -c \
   "SELECT pid, now() - query_start AS duration, query \
    FROM pg_stat_activity \
    WHERE state = 'active' AND datname = 'calisthenics' \
    ORDER BY duration DESC LIMIT 10;"`
3. Long-running queries → look for missing index. Check `EXPLAIN ANALYZE` output.
4. Common offenders:
   - `nodes` table full scan during placement → ensure `tree_id` is indexed.
   - `workouts` table seq scan during `/sync` → ensure `(user_id, performed_at DESC)` is indexed.
5. If a query needs a new index, **don't ship it during the incident** — open a PR, ship via the normal flow.

### Migration failed mid-deploy

1. Coolify → `calisthenicstree-api` → Logs → look for `alembic.util.exc.CommandError`.
2. Old container is already stopped (pre-start hook). Site is **down**.
3. SSH in, run migration manually to see the full error:
   ```bash
   docker exec -it calisthenicstree-api alembic upgrade head
   ```
4. If the migration is broken → restore from backup (section 5), then write a corrective forward migration.
5. If the migration is fine but the **new code** can't run → rollback to previous image (section 4).

---

## 8. Secrets management

`.env` lives on the VPS at `/opt/calisthenics-tree/.env` (or per-service in Coolify's UI). Never in the repo.

**Why this dance:** copying `.env` via `scp` or piping through `cat <<EOF` is fragile — `~`, `"`, `$`, multiline values all get mangled. Per the Zorva gotcha (memory 2026-06-24), base64-encode locally, decode remotely into a clean file. One atomic write, no escape hell.

### Update a secret

1. **Locally:** edit `.env.production` (kept in 1Password, never committed).

2. **Base64-encode:**
   ```bash
   base64 -i .env.production | tr -d '\n' > .env.production.b64
   ```

3. **Ship it:**
   ```bash
   ssh root@187.77.26.99 'echo BASE64STRINGGOESHERE | base64 -d > /opt/calisthenics-tree/.env'
   ```
   Replace `BASE64STRINGGOESHERE` with the contents of `.env.production.b64`. Use single quotes around the ssh command so `$` isn't expanded locally.

4. **Verify:**
   ```bash
   ssh root@187.77.26.99 'cat /opt/calisthenics-tree/.env | head -5'
   ```

5. **Restart the affected service** in Coolify → App → Restart.

### Rotate a secret

Same as above, then trigger a redeploy. Never edit `.env` in-place on the VPS — use the local → b64 → ssh pipeline every time.

---

## 9. Manual commands cheat sheet

The 10 commands Cameron runs most often.

```bash
# 1. SSH into the VPS
ssh root@187.77.26.99

# 2. Tail API logs (live)
docker logs calisthenicstree-api --tail 200 -f

# 3. Tail DB logs (live)
docker logs calisthenicstree-db --tail 200 -f

# 4. Force-rebuild + restart API
docker compose -f /opt/calisthenics-tree/docker-compose.prod.yml up -d --build api

# 5. Run a migration manually (e.g. after fixing bad code)
docker exec calisthenicstree-api alembic upgrade head

# 6. Roll back the last migration (LOCAL ONLY — never on prod)
docker exec -it calisthenicstree-api alembic downgrade -1

# 7. Open a psql shell against production
docker exec -it calisthenicstree-db psql -U calisthenics -d calisthenics

# 8. Smoke test the public health endpoint
curl -fsS https://calisthenics-tree.com/healthz | jq .

# 9. List backups
ssh root@187.77.26.99 'ls -lht /opt/backups/calisthenicstree/ | head -10'

# 10. Ship a new .env (see section 8)
ssh root@187.77.26.99 'echo BASE64 | base64 -d > /opt/calisthenics-tree/.env'
```

### One more — kill a stuck session in Postgres

```bash
docker exec calisthenicstree-db psql -U calisthenics -d calisthenics -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity \
   WHERE datname = 'calisthenics' AND pid <> pg_backend_pid() AND state = 'idle';"
```

### And one for the web container

```bash
docker logs calisthenicstree-web --tail 200 -f
```