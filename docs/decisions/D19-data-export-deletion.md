# D19 — Data export + account deletion (GDPR / CCPA / PIPEDA)

Status: **DRAFT — needs decision before Phase 2 web app**

GDPR requires both. CCPA (California) and PIPEDA (Canada — Cam's jurisdiction) require deletion. LGPD (Brazil — Hevy's largest market per the competitor audit) tracks GDPR. Same implementation covers all four.

## Data export

### Trigger
- Settings → Privacy → "Export my data" button
- POST /api/v1/users/me/export → returns 202 with a job ID
- arq job (D9) generates the export bundle asynchronously
- Email when ready: "Your data export is ready. [Download link]"
- Link valid for 7 days, then deleted

### Format
ZIP file containing:
- `profile.json` — user profile, account creation date, subscription history
- `workouts.json` — every workout logged, with set-by-set detail
- `progressions.json` — every node unlocked, every regression, every tendon event
- `social.json` — accepted friends list, sent/received invites
- `settings.json` — all user preferences

JSON, not CSV. CSV loses the relationships between workouts and sets; JSON preserves the full structure. ~500KB-2MB per user for a year of data.

### What's NOT in the export
- Auth tokens, magic-link tokens, session data
- Internal logs, audit trails
- Aggregated analytics events (PostHog owns those)

## Account deletion

### Trigger
- Settings → Privacy → "Delete my account" button
- Confirmation modal: "This deletes your account, all workouts, all unlocks, all friends. This cannot be undone. Type DELETE to confirm."
- Requires typing the literal word "DELETE"
- 7-day grace period: account is soft-deleted, recoverable via login. Email confirms: "Your account is scheduled for deletion on [date]. Log in to cancel."
- After 7 days: hard delete via arq job.

### Hard delete cascade
1. User row deleted
2. All workouts + sets deleted (CASCADE)
3. All progression state deleted (CASCADE)
4. All friend relationships deleted
5. All share cards deleted (PNG files)
6. Subscription cancelled via App Store Server API
7. Apple ID association broken
8. PostHog `identify` event sent with `delete: true` to anonymize analytics
9. Postmark contact deleted
10. Sentry user data scrubbed (manual via support)
11. Audit log entry: "User X deleted their account on [date]" (kept for legal compliance, no PII)

### What survives deletion
- Anonymous, aggregated metrics: "10,000 workouts logged this month" — fine.
- The audit log entry itself — no PII, just "a user deleted their account on date."
- Anything in Apple's systems (subscription history is theirs to retain).

## Privacy policy statement

Add to `/privacy` page:
- We collect: email, workout data, body metrics (optional), usage analytics, friend graph
- We process: provide the service, calculate tendon strain, send notifications, prevent fraud
- We retain: account data until deletion + 30 days for grace period
- We share: Apple (payments), Postmark (email), PostHog (analytics) — each with their own DPA
- Your rights: access (export), deletion, portability — contact support@calisthenics-tree.com

## Action
T6 (endpoints) implements export + soft-delete. D9 background job handles the async export + hard-delete. Privacy policy in T32 (legal pages).