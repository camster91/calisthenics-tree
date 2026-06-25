# D5 — Logging standard

Status: **LOCKED 2026-06-25** (decision before Phase 1)

## Decision

**Structured JSON logs to stdout.** 12-factor app style. v1 has no log shipper —
Coolify captures container stdout to disk. Errors flow to Sentry separately.

| Concern | Choice |
|---|---|
| Format | Structured JSON, one line per log record |
| Output (v1) | stdout only — Coolify tail captures to disk |
| Error reporting | Sentry free tier (FastAPI + frontend) — separate SDK, not via stdout |
| Analytics product tracking | PostHog Cloud — also separate SDK |
| NOT in v1 | Datadog, CloudWatch, ELK, Splunk, Loki, Datadog Logs |

**Why no log shipper in v1:** plan says MVP scope is "load → place → log one workout →
unlock one node → paywall." Adding a log pipeline at MVP stage is over-engineering.
Coolify container stdout is grep-able for incident triage. Add Loki (or similar) only
when grep stops scaling past ~5 GB/day of logs or when on-call needs to correlate across
services.

## Schema

```json
{
  "timestamp": "2026-06-25T14:32:11.482Z",
  "level": "INFO",
  "logger": "api.app.routes.workouts",
  "message": "Workout logged",
  "service": "calisthenics-api",
  "env": "prod",
  "trace_id": "01HX7K2P9J4F",
  "user_id": "usr_883a11b0",
  "event": "workout_logged",
  "duration_ms": 142,
  "node_id": "node_tuck_lever_03",
  "sets_count": 4,
  "total_volume": 0
}
```

## Required fields (every log line)

- `timestamp` — ISO 8601 UTC with milliseconds (`2026-06-25T14:32:11.482Z`)
- `level` — one of `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`
- `logger` — Python dotted module path (e.g. `api.app.routes.workouts`)
- `service` — `"calisthenics-api"` or `"calisthenics-web"` (constant per process)
- `env` — `"dev" | "staging" | "prod"` (read from `APP_ENV`)
- `message` — human-readable one-liner, no embedded newlines, no trailing periods
- `trace_id` — ULID from D4 trace middleware (always present, even for non-request logs:
  use a process-level ULID for startup/shutdown lines)

## Optional fields (when relevant)

- `user_id` — opaque server-generated ID (`usr_…`). Never the user's email.
- `node_id`, `workout_id`, `routine_id` — entity context for the event.
- `event` — semantic event name for queryable logs (`workout_logged`, `node_unlocked`,
  `auth_failed`, `placement_completed`, `subscription_started`). Stable, lowercase,
  snake_case. Add new events as we need them.
- `duration_ms` — for any operation worth timing (DB queries, HTTP calls, placement).
- `http.method`, `http.path`, `http.status_code` — request envelope on per-request logs.
- `error.type`, `error.message`, `error.stack` — for exceptions. `error.stack` is
  WARNING/ERROR level only; never on INFO.
- `context` — free-form dict for event-specific extras (e.g. `{ "rep_count": 12 }`).

## Log levels by environment

| Env | Default | DEBUG enabled? | Routing |
|---|---|---|---|
| dev | DEBUG | yes | stdout only |
| staging | INFO | yes, via `LOG_LEVEL=DEBUG` | stdout only |
| prod | INFO | no | stdout + Sentry (ERROR/CRITICAL only) |

**Level guidance:**

- **DEBUG** — verbose dev/tracing. SQL queries, request bodies, full diffs. Off in prod.
- **INFO** — normal operation events. Request completed, workout logged, node unlocked,
  subscription started. Default for everything user-visible.
- **WARNING** — recoverable problems. Retry succeeded after failure, deprecated API path
  used, rate limit hit, Sentry SDK dropped an event.
- **ERROR** — operation failed but service still works. Unhandled exception in a route,
  failed DB write, payment processor error.
- **CRITICAL** — service-level failure. DB unreachable, can't bind port, app startup
  failed. Pages on-call via Sentry alert.

**Sentry routing rule:** `ERROR` and `CRITICAL` only. `WARNING` stays in stdout logs.
INFO/DEBUG never go to Sentry (volume + cost — Sentry free tier is 5K events/month).

## PII rules

**Never log the following — not even hashed:**

- Email addresses (raw OR with domain visible). Use `email_hash: "sha256:9f86…"` only
  when the email itself is the user identifier for that event.
- Body weight / body mass / body-fat percentage. HealthKit-derived. Never logged.
- Auth tokens, magic-link tokens, JWTs, session cookies, refresh tokens, API keys.
  Never logged, ever — not even at DEBUG.
- Exact workout timestamps below the day. For analytics events, log
  `workout_date: "2026-06-25"` (UTC date only) not `workout_at: "2026-06-25T14:32:11Z"`.
  Exact timestamps stay server-side in `workouts.completed_at` and are queryable from
  the DB. Log-level granularity is coarse on purpose.
- IP addresses: log the first 3 octets only for rate-limit debugging
  (`203.0.113.0/24`). Never the full address. Never the IPv6 /64 (too identifying).

**Hashing for analytics:**

- `user_id` is server-generated (`usr_<22 base32 chars>`), opaque, and stable. It is
  not PII by itself — treat it as the join key. Use it directly in `user_id` field.
- When exporting logs to an analytics sink (PostHog, BigQuery, etc.) hash `user_id`
  with HMAC-SHA256 using a per-env secret (`ANALYTICS_HASH_KEY`). The plain ID stays
  inside our logs; downstream sees only the hash.
- `email_hash` uses a different key (`PII_HASH_KEY`) so analysts can't join email to
  user_id without crossing two key boundaries.

**Child-safety specifics:** the app has a minor-user path (age gate in onboarding).
For users flagged as under-13:

- No `event` field ever contains free-text input (comments, routine names).
- Strip `error.message` of any user-supplied string before logging.
- Sentry `before_send` hook drops the user from the event payload entirely (just
  keep the trace_id and route).

## Library choice: stdlib `logging` + `python-json-logger`

**Picked:** stdlib `logging` + `python-json-logger` (the `python-json-logger` project,
not `python-json-logger2`).

**Considered:**

| Library | Pros | Cons | Verdict |
|---|---|---|---|
| `logging` + `python-json-logger` | stdlib is one less dependency; familiar config; integrates with any stdlib-aware handler (Sentry SDK has a `LoggingIntegration`); no vendor lock-in | JSON formatter is a thin wrapper, no built-in trace_id propagation, no structlog-style contextvars | **PICKED** |
| `loguru` | simpler API out of the box, batteries-included JSON formatter, colorized dev output, decorator-based context binding | opinionated about handler config; harder to integrate with stdlib handlers (Sentry's LoggingIntegration); fewer FastAPI/Uvicorn examples; one more dep | rejected — convenience not worth the integration friction |
| `structlog` | contextvars-based binding is genuinely nice, dev renderer is pretty, structured-by-default | two ways to log (stdlib + structlog) invites inconsistency; larger API surface; FastAPI middleware examples are sparser | rejected — adds a parallel logging API on top of stdlib without enough payoff for our scope |

**Integration points:**

- **Uvicorn** — pass `--log-config api/log_config.json` (extends stdlib). Suppresses
  uvicorn's default access log lines into our JSON format.
- **Sentry** — `sentry_sdk.init(..., integrations=[LoggingIntegration(level=ERROR)])`.
  Stdlib `logging` ERROR+ records are captured as Sentry events automatically.
- **FastAPI middleware** — D4's `TraceIdMiddleware` also binds `trace_id` into the
  contextvars so every log line in the request handler carries it without manual
  passing.

## Example log line composition

```python
# api/calisthenics_api/logging.py
import logging
from pythonjsonlogger import jsonlogger

class TraceIdFilter(logging.Filter):
    def filter(self, record):
        record.service = "calisthenics-api"
        record.env = settings.app_env
        record.trace_id = trace_id_var.get() or "-"
        return True

handler = logging.StreamHandler()
handler.setFormatter(jsonlogger.JsonFormatter(
    "%(timestamp)s %(level)s %(name)s %(message)s",
    rename_fields={"timestamp": "asctime", "level": "levelname", "name": "logger"},
))
handler.addFilter(TraceIdFilter())

root = logging.getLogger()
root.handlers = [handler]
root.setLevel(settings.log_level)  # DEBUG in dev, INFO elsewhere
```

## Verification

- [ ] First `INFO` line from T26 (workouts endpoint) carries `trace_id`, `service`,
      `env`, `event: "workout_logged"`.
- [ ] First `ERROR` from a forced exception shows up in Sentry within 30 seconds with
      matching `trace_id`.
- [ ] Grep test: `docker logs calisthenics-api | grep '"event":"workout_logged"' | jq`
      returns valid JSON for every line (no stack traces leaking into the message field).
- [ ] No log line in staging/prod contains the strings `password`, `token`, `Bearer`,
      `@`, or a `.com`/`.ca`/`.io` substring in `message` or `context` (regex sweep
      in CI before deploy).

## Action

- T1 (scaffold) sets up `api/calisthenics_api/logging.py` + `api/log_config.json`.
- T6 (FastAPI endpoints) emits structured events via stdlib `logging`.
- T26 (workouts endpoint) is the first concrete consumer; its log shape is the
  reference for T27-T29.
- Sentry SDK init lives in T6 alongside the trace middleware.