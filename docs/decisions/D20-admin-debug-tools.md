# D20 — Admin / debug tools

Status: **DRAFT — needs decision before Phase 2 web app**

## The problem
At 100+ users, "user X says the app broke" becomes a daily support task. Without internal tooling, you ssh into the VPS, grep logs, query Postgres, guess. At 1k users, this stops scaling.

## Internal API (gated by admin auth)

A small set of endpoints, NOT exposed to the public internet, available only via VPN or admin token:

### User lookup
```
POST /admin/users/lookup
Body: { email: "cam@ashbi.ca" }
Returns: { user_id, created_at, subscription_tier, last_seen_at, workout_count }
```

### User action history
```
GET /admin/users/<user_id>/events?since=2026-06-01
Returns: array of { event, timestamp, trace_id, metadata }
```

This is the "what did this user do in the last week" view. Backed by the structured logs (D5).

### Force action
```
POST /admin/users/<user_id>/actions
Body: { action: "grant_pro" | "revoke_pro" | "reset_password" | "send_magic_link" }
Returns: { success: true, audit_log_id: "..." }
```

Every action writes to `admin_audit_log`. No silent changes.

### Subscription override
For support: extend a user's Pro trial by N days, refund a charge, etc. Backed by App Store Server API.

### Metrics dashboard
```
GET /admin/metrics/overview
Returns: { mau, new_signups_today, churn_7d, paying_users, mrr, arpu, ltv_30d }
```

Read-only, computed from Postgres + PostHog.

## Admin auth

- Separate auth from user auth. Admin users have a `role: 'admin'` column on the user table.
- Only Cam (founder) is admin in v1. No "team" until there's a team.
- Admin endpoints require an admin JWT with a separate signing key.
- Access log: every admin API call is logged with admin user_id + target user_id + action.

## Local CLI

For things that shouldn't go through HTTP:

```bash
# Look up a user
calisthenics-admin user:lookup --email cam@ashbi.ca

# View a workout by ID
calisthenics-admin workout:show <workout_id>

# Manually re-trigger tendon strain calc for a user
calisthenics-admin tendon:recalc <user_id>

# Postgres shell (read-only by default, write requires --i-know-what-im-doing)
calisthenics-admin db:shell
calisthenics-admin db:shell --write
```

Lives in `apps/admin/cli.py`, deployed to the VPS, run via ssh.

## Sentry for app errors

Already in T7. Sentry alerts via email on:
- New error type (never seen before)
- Error spike (>10x normal rate for any error)
- Error in a paid user's session (tagged by subscription_tier)

## Alerting

In v1: just Sentry email alerts. No PagerDuty, no Slack integration. Solo founder can't be on-call anyway.

## What we explicitly don't build

- **Full admin SPA.** The CLI + SQL shell + Sentry dashboard cover 90% of needs.
- **Customer support inbox integration.** Phase 5+ when there are actual support tickets.
- **In-app admin actions.** Admin work happens outside the app, on a laptop.

## Action
T1 (scaffold) sets up the admin CLI skeleton. T6 (endpoints) adds the internal API gated by admin role. T7 (Sentry) configures the alert rules.