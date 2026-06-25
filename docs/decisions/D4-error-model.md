# D4 — Error model

Status: **LOCKED** (2026-06-25, finalized for Phase 1)
Implements: T26-T29 (FastAPI endpoints, validation, auth, server errors)
Depends on: D5 (logging) — `trace_id` is the join key.

## Decision

Every error response from the API follows **RFC 7807 Problem Details for HTTP APIs** (`application/problem+json`). FastAPI 0.138 ships without a first-party RFC 7807 helper, so we implement it via three custom exception handlers registered in `calisthenics_api/main.py`:

1. `HTTPException` → RFC 7807 with `code` extension
2. `RequestValidationError` (Pydantic) → 422 with `errors[]` array
3. `Exception` (catch-all) → 500 with generic message + trace_id

### Why RFC 7807 (and not `{error: {code, message, details}}`)

- **Standard.** Clients in any language can parse it; libraries exist in JS, Swift, Kotlin.
- **Self-describing.** `type` is a URL — clickable in dev tools, can host human docs.
- **Extensible.** RFC 7807 explicitly allows custom fields. We add `code` (stable machine code) and `trace_id` (correlation).
- **Already required for HealthKit-adjacent apps.** Apple's URLSession treats `application/problem+json` as first-class; web fetchers display it cleanly.

The alternative (`{error: {code, message, details}}`) is fine but every frontend engineer reinvents it slightly differently. RFC 7807 is the boring choice.

## Status code policy

| Code | When | RFC 7807 `type` base |
|---|---|---|
| 200 | Success, body present | n/a |
| 201 | Resource created | n/a |
| 204 | Success, no body (e.g. DELETE) | n/a |
| 400 | Malformed request — JSON parse error, missing required field at the wire level | `/errors/bad-request` |
| 401 | Missing or invalid auth token | `/errors/unauthorized` |
| 403 | Authenticated, not authorized (e.g. viewing another user's workout) | `/errors/forbidden` |
| 404 | Resource not found | `/errors/not-found` |
| 409 | Conflict — duplicate email on signup, concurrent edit | `/errors/conflict` |
| 422 | Validation failed — well-formed but semantically wrong (`reps=-1`) | `/errors/validation` |
| 429 | Rate limited | `/errors/rate-limited` |
| 500 | Unexpected server error (always logged with trace_id) | `/errors/internal` |
| 503 | Service unavailable / planned maintenance | `/errors/unavailable` |

**400 vs 422 — the rule we will not argue about:**
- 400 = the request can't be parsed at all (broken JSON, wrong content-type, missing `Content-Length`).
- 422 = the request parses fine but fails domain validation (Pydantic model constraints, business rules).

If a route uses a Pydantic body model, **422 is the default for body validation failures** — the handler produces `errors[]` automatically. 400 is reserved for protocol-level failures (invalid JSON, wrong method).

## Response body shape

```json
{
  "type": "https://calisthenics-tree.com/errors/not-found",
  "title": "Node not found",
  "status": 404,
  "detail": "No progression node with id=node_tuck_lever_03",
  "instance": "/api/v1/progressions/node_tuck_lever_03",
  "code": "node_not_found",
  "trace_id": "01HX7K2P9J4F",
  "errors": null
}
```

| Field | Type | Source | Purpose |
|---|---|---|---|
| `type` | URL (string) | code-to-URL map in `errors.py` | machine-readable category, clickable in devtools |
| `title` | string | code-to-title map | short human label (one line, sentence case) |
| `status` | int | `HTTPException.status_code` | duplicate of HTTP status, but RFC 7807 requires it |
| `detail` | string | call site | human-readable explanation for *this* occurrence |
| `instance` | URL path | `request.url.path` | the request URI that produced this error |
| `code` | string (extension) | call site | stable machine code; clients switch on this |
| `trace_id` | ULID (extension) | middleware | correlation id — see Trace ID section |
| `errors` | array \| null | Pydantic (validation only) | per-field validation failures; null on non-422 |

`type` URLs are not required to resolve, but they must be stable. We host them at `https://calisthenics-tree.com/errors/<slug>` even if the page is a 404 stub at launch — it gives us a place to put human-readable docs later without breaking clients.

## Error code taxonomy

Stable machine codes, snake_case, immutable once shipped. Clients branch on `code`, never on `title` or `detail`.

### Auth & authorization
- `unauthorized` — no/invalid bearer token
- `forbidden` — authenticated but not authorized
- `token_expired` — JWT past `exp`; client should refresh

### Resource lookups (404)
- `user_not_found`
- `workout_not_found`
- `node_not_found`
- `tree_not_found`
- `progression_not_found`
- `unlock_not_found`

### Validation (422)
- `validation_failed` — generic, see `errors[]` for per-field detail
- Per-field codes live in `errors[].code` (e.g. `min_value`, `required`, `uuid_invalid`)

### Domain conflicts (409)
- `email_already_registered`
- `duplicate_workout` — same `client_workout_id` already synced
- `concurrent_edit` — last-write-wins loser flag

### Domain-specific business rules
- `unlock_in_progress` — user is mid-placement; can't log workouts yet
- `node_locked` — tried to log sets on a node they haven't unlocked
- `regression_required` — current set log would regress but no regression edge exists
- `tendon_strain_critical` — server-side override blocks this workout
- `rate_limited` — 429, also includes `retry_after_seconds`

### Server errors (500)
- `internal` — generic catch-all, never exposes internals
- `database_unavailable`
- `dependency_timeout`

Adding a new code: add to the enum in `calisthenics_api/errors.py`, add the title/type URL mapping, add a test in `tests/test_error_model.py`. No new HTTPException inline anywhere else in the codebase — route handlers must use the typed helpers in `errors.py`.

## Trace ID strategy

Every request gets a `trace_id` (ULID, generated at the FastAPI middleware layer). Format: 26-char Crockford ULID (`01HX7K2P9J4F...`), lexicographically sortable by creation time.

### Where the trace_id appears

| Surface | Format | Notes |
|---|---|---|
| Response body | `trace_id` field | always present on error responses |
| Response header | `X-Trace-Id: 01HX7K2P9J4F` | present on **all** responses (success and error) |
| Log lines | `trace_id` JSON field | every log line for the request, set by contextvar |
| Sentry tags | `trace_id` | automatic via Sentry's before_send hook |
| Client-reported bugs | requested in support template | "send us your trace_id" |

### Generation

- New request without incoming header: middleware generates `ulid.new()`.
- New request with incoming `X-Trace-Id` header: middleware validates (ULID format) and reuses. This lets a frontend add its own correlation id and have it flow through.
- Invalid incoming header: log a warning, generate fresh.

### Storage

- Stored in `contextvars.ContextVar` so route handlers, DB session, and log formatter all see the same value without passing it as a parameter.
- Cleared at middleware exit to avoid bleed across requests in the same worker.

### Why ULID over UUIDv4 or nanoid

- Sortable by creation time → log searches by `trace_id:` prefix give chronological order, useful when grepping incident windows.
- 26 chars vs UUID's 36 — easier to read off a Slack message.
- Crockford base32 — avoids `I`, `L`, `O`, `U` (no copy-paste ambiguity with `1`/`0`).
- No PII risk (unlike sequential int).

## Concrete examples

### 1. Validation error (422) — Pydantic body constraint

Request:
```
POST /api/v1/workouts/sync
Content-Type: application/json
{
  "sync_client_timestamp": "2026-06-25T12:00:00Z",
  "workouts": [{
    "client_workout_id": "wk-001",
    "completed_at": "2026-06-24T18:00:00Z",
    "logs": [{
      "node_id": "node_tuck_lever_03",
      "sets": [
        {"set_number": 0, "hold_secs": 15, "reps": null},
        {"set_number": 2, "hold_secs": -3, "reps": null}
      ]
    }]
  }]
}
```

Response:
```
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/problem+json
X-Trace-Id: 01HX7K2P9J4FQ8R1XA2B5C7D9E

{
  "type": "https://calisthenics-tree.com/errors/validation",
  "title": "Validation failed",
  "status": 422,
  "detail": "One or more fields failed validation",
  "instance": "/api/v1/workouts/sync",
  "code": "validation_failed",
  "trace_id": "01HX7K2P9J4FQ8R1XA2B5C7D9E",
  "errors": [
    {
      "field": "workouts.0.logs.0.sets.0.set_number",
      "code": "min_value",
      "message": "must be >= 1"
    },
    {
      "field": "workouts.0.logs.0.sets.1.hold_secs",
      "code": "min_value",
      "message": "must be >= 0"
    }
  ]
}
```

### 2. Not found (404) — domain resource

Request:
```
GET /api/v1/progressions/node_does_not_exist
Authorization: Bearer ...
```

Response:
```
HTTP/1.1 404 Not Found
Content-Type: application/problem+json
X-Trace-Id: 01HX7KBM3T5P7S9U1V3W5Y7Z9A

{
  "type": "https://calisthenics-tree.com/errors/not-found",
  "title": "Node not found",
  "status": 404,
  "detail": "No progression node with id=node_does_not_exist",
  "instance": "/api/v1/progressions/node_does_not_exist",
  "code": "node_not_found",
  "trace_id": "01HX7KBM3T5P7S9U1V3W5Y7Z9A",
  "errors": null
}
```

### 3. Auth error (401)

Request:
```
GET /api/v1/users/me/progressions
(no Authorization header)
```

Response:
```
HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json
WWW-Authenticate: Bearer
X-Trace-Id: 01HX7KCQ5V7X9Z1B3D5F7H9J1L

{
  "type": "https://calisthenics-tree.com/errors/unauthorized",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Missing bearer token",
  "instance": "/api/v1/users/me/progressions",
  "code": "unauthorized",
  "trace_id": "01HX7KCQ5V7X9Z1B3D5F7H9J1L",
  "errors": null
}
```

### 4. Server error (500)

Request:
```
POST /api/v1/workouts/sync
Authorization: Bearer ...
Content-Type: application/json
{ ... }
```

(Internal DB connection drops mid-transaction.)

Response:
```
HTTP/1.1 500 Internal Server Error
Content-Type: application/problem+json
X-Trace-Id: 01HX7KD27W9Y1B3D5F7H9J1L3N

{
  "type": "https://calisthenics-tree.com/errors/internal",
  "title": "Internal server error",
  "status": 500,
  "detail": "An unexpected error occurred. Please try again or contact support with the trace_id.",
  "instance": "/api/v1/workouts/sync",
  "code": "internal",
  "trace_id": "01HX7KD27W9Y1B3D5F7H9J1L3N",
  "errors": null
}
```

Server-side log line for the same request (per D5):
```json
{
  "timestamp": "2026-06-25T14:32:11.482Z",
  "level": "ERROR",
  "logger": "calisthenics_api.routes.workouts",
  "message": "Unhandled exception in sync_workouts",
  "trace_id": "01HX7KD27W9Y1B3D5F7H9J1L3N",
  "user_id": "usr_883a11b0",
  "event": "internal_error",
  "error": {
    "type": "sqlalchemy.exc.OperationalError",
    "message": "server closed the connection unexpectedly",
    "stack": "...full traceback..."
  }
}
```

The Sentry event has `trace_id` as a tag, so the support team can grep Sentry by the value the user pasted and find the exact log line.

## Implementation contract for T26-T29

T26 (validation) implements:
- `calisthenics_api/errors.py` — `ProblemDetail` Pydantic model, code-to-(type,title) registry, helpers like `raise_problem(status, code, detail)`
- `RequestValidationError` handler that maps Pydantic's `errors()` to our `errors[]` shape
- All `HTTPException` raises in route files call the helper, not raw `HTTPException`

T27 (auth) implements:
- Auth dependency updated to use `raise_problem(status.HTTP_401_UNAUTHORIZED, "unauthorized", "...")` instead of raw `HTTPException`
- Keeps the `WWW-Authenticate: Bearer` header on 401s

T28 (server errors) implements:
- Catch-all `Exception` handler that returns generic 500 with `code: "internal"` and the `trace_id`
- Sentry SDK configured to read trace_id from contextvar and attach as a tag
- Error log line with full traceback (per D5 schema)

T29 (logging bridge) implements:
- Trace ID middleware (`BaseHTTPMiddleware`) that generates/validates ULID, sets contextvar, sets `X-Trace-Id` response header
- JSON log formatter reads contextvar and emits `trace_id` field on every line
- Same trace_id flows from request → log → Sentry → user-reported bug

### Tests required (in `tests/test_error_model.py`)

- 422 returns `Content-Type: application/problem+json` and `errors[]` populated
- 404 returns problem body with `code: "node_not_found"` (or relevant code)
- 401 returns problem body + `WWW-Authenticate` header
- 500 returns generic body (no stack) + `trace_id` in body and header
- Every response (success and error) has `X-Trace-Id` header matching ULID format
- Incoming `X-Trace-Id` is honored when valid, regenerated when malformed
- `code` values match the taxonomy enum — no typo'd codes slip through

## Do NOT

- Don't expose `sqlalchemy.exc.OperationalError` or any internal exception class in `detail`. The 500 handler must sanitize. Stack traces are server-side only (D5 log, Sentry event).
- Don't put PII in `detail`. The 4xx handlers are fine; the 500 handler must NOT echo user input verbatim.
- Don't let route handlers raise `HTTPException` directly. Always go through `raise_problem(...)` so the `code` field stays consistent.
- Don't use HTTP 200 with `{error: ...}` body. RFC 7807 requires the HTTP status to reflect the failure.
- Don't add new error codes without updating `errors.py` + tests. The taxonomy is the contract.
- Don't use raw UUIDs for trace_id. ULID only — sortable, readable, PII-safe.
- Don't log `detail` at ERROR level for 4xx. 4xx is client mistake; log at INFO with `event: "client_error"`. 5xx is server fault; log at ERROR with full stack.

## Migration notes

- Current `auth.py` raises raw `HTTPException` with `detail="..."` — T27 will refactor.
- No existing routes use `RequestValidationError` overrides; FastAPI's default 422 returns `{detail: [{loc, msg, type}]}` which clients may already consume. The new handler preserves field info via `errors[]` — clients should migrate to `errors[].code`/`message` for stable codes.
- `X-Trace-Id` is a new header; existing clients ignore unknown headers, so no breaking change.