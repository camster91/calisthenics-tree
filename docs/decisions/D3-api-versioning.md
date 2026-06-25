# D3 — API versioning strategy

Status: **LOCKED 2026-06-25** (this is the reference for T26-T29 endpoint work)

## Question
The plan ships routes under `/api/v1/` (e.g. `/api/v1/workouts/sync`, `/api/v1/users/me/progressions`, `/api/v1/share/[unlock_id].png`) but has no policy on when we bump to v2, how long old versions stay alive, what counts as breaking, or how the iOS app (Capacitor Phase 4) handles forced upgrades. Bad versioning bites at 5k+ users; we want the rules on paper before T26 ships.

## Options considered

| Option | How it works | Pros | Cons | Verdict |
|---|---|---|---|---|
| **A. URL prefix** | `/api/v1/`, `/api/v2/` | Explicit, cache-friendly, easy to grep in logs, the most-documented pattern on the internet. | URL drift over years — `/api/v3/foo` is uglier than `Accept: application/vnd.api.v3+json`. | **CHOSEN** |
| B. Header (no version in URL) | `Accept: application/vnd.calisthenicstree.v2+json` | "Cleaner" URLs, separates versioning from routing. | Proxies and CDNs don't cache by header by default. Browser fetch tools can't eyeball it. Requires custom middleware in FastAPI. | Rejected |
| C. Date-header (Stripe-style) | `Accept: application/vnd.calisthenicstree+json; version=2026-06-25` | Fine-grained, allows "API as a service." | Date semantics are subtle. Confusing to SDK consumers. Overkill for a 3-endpoint app. | Rejected |
| D. No versioning (overwrite in place) | Edit routes whenever, hope mobile apps catch up | "Move fast." | Same trap every startup hits: mobile app v1.2.0 on a user's phone forever, can't deprecate the old shape. 5k+ users = guaranteed broken installs. | Rejected |

URL prefix wins because the iOS app is a Capacitor hybrid that ships to TestFlight with a forced upgrade window we cannot control — we need a version in the URL so we can route `/api/v1/` to old code and `/api/v2/` to new code at the gateway, not at the client.

## Decision

**URL-prefix versioning at `/api/v{N}/`.** v1 launches with the Phase 1 endpoints. v2 ships only on breaking changes. Non-breaking changes go to the current version.

### What counts as breaking

| Change | Breaking? | Reasoning |
|---|---|---|
| Add new endpoint | No | Additive; existing clients never hit it. |
| Add new optional field to response | No | Additive; old clients ignore unknown fields. |
| Add new optional query param | No | Old clients don't pass it; server uses its default. |
| Add new error code | No | Old clients don't match on it. |
| **Remove endpoint** | **Yes** | Hard failure for any client still calling it. |
| **Rename response field** | **Yes** | Old clients reading `node_name` get `undefined`. |
| **Change field type** (string → int, int → enum) | **Yes** | Old clients crash on parse. |
| **Remove response field** | **Yes** | Old clients reading that field get `undefined` silently — worse than crash. |
| Add new required query param | **Yes** | Old clients won't pass it; endpoint returns 400. |
| Change auth scheme | **Yes** | Old clients can't auth at all. |
| Tighten validation (e.g. min 1 → min 5) | **Yes** | Data the old client used to send now gets rejected. |
| Change error code name | **Yes** if clients match on string codes | Depends on contract — see "Error code policy" below. |
| Rename enum value | **Yes** | Same as field type change. |

**Default rule of thumb:** if a previously-passing request starts returning a different status code, a different body shape, or different field names — that's breaking. Otherwise it's not.

### Error code policy

The error model (D4) will define a stable, machine-readable `error.code` field on every error response (e.g. `WORKOUT_LOCKED`, `NODE_NOT_FOUND`, `AUTH_TOKEN_EXPIRED`). Clients must switch on `code`, never on the human-readable `message`. Renaming a `code` value is breaking. Adding a new `code` value is not. This rule is what makes error responses safely versionable.

## Deprecation policy

When v2 ships:

1. **6-month overlap window.** v1 keeps serving traffic for 6 calendar months after v2 launches. No exceptions, no "we'll migrate fast" promises — 6 months covers at least one full iOS release cycle and one full seasonal DAG event.
2. **Warning headers on every v1 response.** Every response from a deprecated version includes:
   - `Deprecation: true` (RFC 8594 sunset-style deprecation header)
   - `Sunset: <Sat, 01 Jan 2028 00:00:00 GMT>` (the date v1 stops responding)
   - `X-API-Deprecation-Message: v1 retires 2028-01-01. Migrate to /api/v2/. See https://calisthenics-tree.com/docs/api/migration-v1-to-v2`

   These warnings are free signal: log them server-side, fire a PostHog event per client fingerprint, and we know exactly which clients are still on v1.
3. **At sunset, v1 returns `410 Gone`.** No silent deletion. Mobile clients calling `/api/v1/foo` after the sunset date get a `410` with a `Link` header pointing at the v2 docs. Clients with cached creds keep getting structured failures, not `404`s they don't know how to handle.
4. **Maximum 2 active versions at once.** v1 + v2 OR v2 + v3. Never three. When v3 ships, v1 dies on the same day v3 ships (with the 6-month warning already broadcast since v2's launch).
5. **Major-version-only breaking changes.** Bug fixes, performance, internal refactors all ship under the current major. We don't bump to v2.5. We don't bump to v3 because we removed one field. The major version number answers exactly one question: *"Will my old code still work?"*

## Client SDK / mobile app lifecycle

We don't ship standalone SDK packages in Phase 1-3 (the web app talks to the API directly via `fetch`). Starting Phase 4 (Capacitor iOS), the mobile app is the only consumer and the rules below apply.

- **iOS app version compatibility floor.** Each app release ships against a specific API version. We document the floor in the App Store release notes: *"Requires API v1 (retires 2028-01-01)."* The app's bundle metadata carries the minimum version it supports. On launch, the app pings a `/api/version` endpoint; if its floor is below the server's oldest supported version, we surface a "Please update" modal and block the app from calling any other endpoint.
- **App Store review timing matters.** Per `research/app-store-category.md` and `healthkit-review-process.md`, App Store submissions take 3-7 days. We do not bump a major API version between November 1 and January 15 — that window contains the holiday forced-upgrade cycle, and a 6-month deprecation clock that overlaps it gets cut short. The deprecation clock starts on the v2 launch date, not the v1 announcement date, and v2 launches after the App Store has approved the v2-ready app build.
- **No backward-compatible API shims in v1 to support v2.** When we ship v2, the v2 endpoint is the canonical implementation; v1 routes forward to a thin shim that maps old shapes to new shapes internally. The shim is throwaway — we delete it at sunset.
- **OpenAPI spec is canonical.** One `openapi.yaml` per active version (`openapi.v1.yaml`, `openapi.v2.yaml`). The mobile app's typed client is generated from the spec at build time. We never hand-write the TypeScript types. The spec change is the API change.
- **Migration guide is a doc, not a guess.** Every major bump ships a `docs/migrations/v1-to-v2.md` with: a request/response diff table, the list of `error.code` values that changed names, the SDK version that drops v1 support, and a copy-paste curl example of every changed endpoint.

## Concrete scenarios

### Scenario 1: adding a new field (non-breaking)
- **Change:** `/api/v1/workouts/{id}` adds `tendon_strain_score: float | null` to the response.
- **Version:** Stays on `/api/v1/`. No version bump.
- **Why:** Old clients ignore the new field. New clients read it. Both work.
- **Action:** Update `openapi.v1.yaml`, regenerate web SDK if any, ship it.

### Scenario 2: renaming a response field (breaking)
- **Change:** `/api/v1/users/me/progressions` renames `node_name` → `display_name` because the iOS team wants consistent naming across screens.
- **Version:** Ships at `/api/v2/users/me/progressions`. v1 keeps `node_name`.
- **Why:** Old iOS builds reading `node_name` would get `undefined` and silently render blank.
- **Action:**
  1. Implement v2 route serving the new shape.
  2. Add v1→v2 shim on the old route: server maps `display_name` → `node_name` in the v1 response until sunset.
  3. Cut v2 launch announcement. Set sunset date 6 months out.
  4. Update OpenAPI specs (both files). Regenerate web SDK + mobile client types.
  5. Add `docs/migrations/v1-to-v2.md` with the field rename table.
  6. Submit v2-ready iOS build to App Store review *before* announcing v2.

### Scenario 3: changing a field's type (breaking)
- **Change:** `/api/v1/share/[unlock_id].png` currently returns `{"unlock_id": "<uuid-string>"}`. We want to return `{"unlock_id": "<int>"}` because the IDs are small integers internally and the string was a mistake.
- **Version:** New route at `/api/v2/share/[unlock_id].png`. Old route keeps the string for 6 months.
- **Why:** Any client that did `parseInt(response.unlock_id)` silently gets NaN. Any client that compared against the string crashes. Both are bad.
- **Action:** Same as Scenario 2. Special note: this is a mistake we made in v1; document it in the migration guide as "v1 returns strings, v2 returns ints, both are valid, regenerate your types."

### Scenario 4: removing an endpoint entirely (breaking)
- **Change:** We shipped a debug endpoint `/api/v1/admin/debug-sessions` in v1. After Phase 5 we move it behind a separate admin gateway and remove it from the public API.
- **Version:** Endpoint disappears from `/api/v1/` at the same moment v2 ships (or any later v1 patch — we can do this in v1 because the endpoint is admin-only and undocumented to consumers).
- **Why:** Admin-only, undocumented in OpenAPI, no production consumer. The 6-month clock applies to documented public endpoints, not internal admin routes.
- **Action:** Delete from `openapi.v1.yaml`. Server logs `404` for any caller hitting the old path. Move the admin route to the separate gateway.

### Scenario 5: tightening validation (breaking)
- **Change:** `/api/v1/workouts` POST currently accepts `sets: int >= 0`. We want to enforce `sets: int >= 1` because zero-set workouts pollute the DAG analytics.
- **Version:** New validation at `/api/v2/workouts`. v1 still accepts zero.
- **Why:** Old clients sending `sets: 0` would start getting `400 VALIDATION_ERROR` and have no fallback.
- **Action:** Same as Scenario 2. Migration guide notes: "v2 rejects zero-set workouts; if you have a UI flow that lets users save an in-progress workout with no sets completed, fix that first."

## Endpoint inventory this doc covers (v1)

From `plan.md` lines 104, 122, 234:

- `/api/v1/users/me/progressions`
- `/api/v1/workouts/sync` (offline-first reconcile)
- `/api/v1/share/[unlock_id].png`
- (T26-T29 will add: `/api/v1/auth/...`, `/api/v1/nodes/...`, `/api/v1/users/...`, `/api/v1/dags/...`)

All v1 endpoints ship under the v1 prefix. OpenAPI spec at `openapi.v1.yaml` is the contract.

## Action

- T26 (FastAPI endpoints) prefixes every route with `/api/v1/`. No version in URL other than `v1`.
- OpenAPI spec lives at `calisthenicstree-api/openapi.v1.yaml`. Generated by FastAPI's built-in tooling, checked into git.
- T39 (share card generator) uses `/api/v1/share/[unlock_id].png`.
- Deprecation headers are added by a single FastAPI middleware so every endpoint emits them when v1 is deprecated — not per-endpoint.
- This doc is the reference for any future "should this be v2?" question. Default: no. Default: additive change goes to v1. Bump to v2 only when a scenario from the table above applies.

## Open questions

- **API versioning for the share card PNG endpoint specifically** — the `unlock_id` is in the URL path, not a query param, so it follows URL versioning cleanly. No special handling needed. Resolved.
- **Should we expose a `/api/version` discovery endpoint?** Yes — it's how the iOS app knows whether it's below the floor. Add to v1 (always available, returns the oldest still-supported version + sunset dates).
