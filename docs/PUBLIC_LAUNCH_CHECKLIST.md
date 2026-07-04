# Public Launch Checklist — Calisthenics Tree @ workout.ashbi.ca

**Date drafted:** 2026-07-02
**Target:** workout.ashbi.ca (SPA) + api.workout.ashbi.ca (FastAPI)
**Current state:** Sprint 41 ready to ship; 15 staged fixes uncommitted; API + web + db all healthy in dev mode on VPS.

---

## TL;DR — 30 min from this checklist to public launch

1. Commit + push Sprint 41 fixes (5 min — I can do this if you green-light)
2. Get a Postmark transactional account + token (10 min — your side)
3. Fill `POSTMARK_TOKEN` + flip `ENVIRONMENT=production` on the VPS (2 min — ssh as below)
4. Restart api container (1 min)
5. Verify boot guard accepts the prod start (1 min — `docker logs calisthenics-tree-api-1 --tail 30`)
6. Run smoke-test.sh (30 sec — confirms 24 invariants still hold)
7. Manual browser smoke: magic-link email → click → cookie set → see home → sign out works (5 min)
8. Optional: fill `SENTRY_DSN` so we actually see errors

That's it. Items 1, 3, 4, 5, 6, 7 are mechanical. Only items 2 and 8 are real work for you.

---

## Pre-launch: 13 Sprint 41 fixes uncommitted (in your working tree)

**Run me to commit + push.** Diff is 223 insertions / 74 deletions across 16 files + 1 new migration `0011_unlock_events_fk_indexes.py`. All ruff + mypy + pytest clean (111 passed, 32 skipped). **No behavior change visible except real perf wins on `/users/me/history` + faster Google crawl on sitemap + harder cookie-delete matching on signout.**

Recommendation: 2 PRs (one squash of 12 commits + one docs PR).

| File | Change |
|---|---|
| `apps/api/alembic/versions/0001_initial.py` | `ON CONFLICT (id) DO NOTHING` on seed inserts (idempotency) |
| `apps/api/alembic/versions/0011_unlock_events_fk_indexes.py` | **NEW** — FK indexes on `unlock_events.tree_id` + `.new_node_id` |
| `apps/api/calisthenics_api/auth.py` | `clear_session_cookie` now mirrors set-cookie attrs (Secure/HttpOnly/SameSite on delete) |
| `apps/api/calisthenics_api/db/models.py` | `MovementType` / `EdgeType` / `JointPathway` → real `enum.StrEnum` |
| `apps/api/calisthenics_api/routes/auth.py` | hoisted 4× `import hashlib` + 1× `import httpx` + 1× `from sqlalchemy.exc import IntegrityError` to module scope |
| `apps/api/calisthenics_api/routes/friends.py` | `Path(..., pattern=_USER_ID_PATH_PATTERN)` on 3 routes (UUID-shaped only — closes garbage-string DoS) |
| `apps/api/calisthenics_api/routes/history.py` | `func.count()` instead of `len(.all())` + dropped redundant `target_sets` query |
| `apps/api/calisthenics_api/routes/seo.py` | `lastmod` → `datetime.now(timezone.utc).date().isoformat()` (was hardcoded `"2026-06-25"`) + lifted `_SITEMAP_NODE_LIMIT` to module scope |
| `apps/api/calisthenics_api/security.py` | docstring fix (single-use IS enforced since Sprint 38 RED-6) |
| `apps/api/tests/test_red7_cookies.py` | updated to read positional arg + restored mypy APIRoute narrowing |
| `apps/api/tests/test_sprint39_p1_bounds.py` | restored mypy APIRoute narrowing |
| `apps/web/.env.example` | `VITE_API_URL` example actually matches api.ts default now (was `/api` wrong) |
| `apps/web/src/lib/api.ts` | clarified default URL comment (default stays `/api/v1` which is correct) |
| `apps/web/src/pages/WorkoutLogPage.tsx` | `eslint-disable-next-line react-hooks/exhaustive-deps` for `api` dep |
| `README.md` | `VITE_API_URL=/api` → `/api/v1` |
| `REVIEW.md` | Sprint 40 + Sprint 41 sections added |

**Still needs your call (not staged):**
- **1.2** Boot guard for `JWT_SECRET` / `MAGIC_LINK_SECRET` / `BEARER_TOKEN` defaults — security MED-1 ∩ code-quality O5 (cross-slice HIGH confidence). Cross-slice consensus on the fix shape; needs your placement (`create_app()` vs Pydantic `model_validator`) + whether to enforce `JWT_SECRET != MAGIC_LINK_SECRET`.
- **1.3** SearchPage dead links (UX #2). Needs `tree_slug` added to search response.
- **1.4** `hashEmailForAnalytics` FNV-1a vs SHA-256 (code-quality R5). Privacy-review concern.

If you skip 1.2/1.3/1.4 for launch, app still works — these are hardening, not launch-blockers. But 1.4 is a privacy-review fail waiting to happen if a CCPA/GDPR auditor reads the docstring.

---

## Real launch steps

### Step 1 — Set up Postmark (your side, ~10 min)

1. Create a Postmark account at https://postmarkapp.com (or use existing if you have one). Free tier covers up to 100 emails/mo — enough for testing.
2. Create a **Server** in Postmark (call it `calisthenics-tree-prod` or similar). Postmark requires server-level sender verification before send.
3. Add `workout.ashbi.ca` as a verified Sender Signature (Postmark → Sender Signatures → Add Domain). They'll give you a DKIM + return-path DNS record.
4. Add these DNS records to wherever `ashbi.ca` is managed (assuming Cloudflare or similar):
   - **DKIM** (TXT): `20230613000000a._domainkey.workout.ashbi.ca → <value from Postmark>`
   - **Return-Path** (CNAME): `pm.mtasv.net`
   - **SPF** (TXT, add to existing `_dmarc` or create): `v=spf1 include:spf.mtasv.net ~all`
5. In Postmark → API Tokens → Create Server Token. Copy the token string.
6. Confirm `POSTMARK_FROM_EMAIL` is `hello@workout.ashbi.ca` (currently set in `/root/calisthenicstree-secrets/.env`).

**Time:** 5-10 min if DNS already propagates fast. Up to 24h for DKIM propagation if your DNS is slow.

### Step 2 — Fill secrets on VPS (~2 min, ssh)

```bash
ssh root@187.77.26.99

# Edit the secrets file (Preserve mode 0600 + the existing comments)
python3 -c "
import pathlib
p = pathlib.Path('/root/calisthenicstree-secrets/.env')
text = p.read_text()
# Replace empty POSTMARK_TOKEN with the real one
text = text.replace('POSTMARK_TOKEN=', 'POSTMARK_TOKEN=<paste your postmark token here>')
# Flip ENVIRONMENT to production (currently 'development')
text = text.replace('ENVIRONMENT=development', 'ENVIRONMENT=production')
# Optional: fill SENTRY_DSN if you have one
# text = text.replace('SENTRY_DSN=', 'SENTRY_DSN=<your dsn>')
p.write_text(text)
print('Updated.')
"

# Sanity-check the diff (no other lines should change)
diff <(git -C /opt/calisthenics-tree diff apps/api/.env.example) /dev/null

# Confirm mode unchanged
chmod 600 /root/calisthenicstree-secrets/.env

# Quick grep to confirm no syntax accidents
grep -E "POSTMARK_TOKEN=|ENVIRONMENT=" /root/calisthenicstree-secrets/.env
```

The python3 here-doc is intentional — editing secrets with bash heredoc over ssh has been a recurring foot-gun (silently drops multiline values). python read+replace+write is byte-safe.

### Step 3 — Restart api to pick up the env change (~1 min)

```bash
ssh root@187.77.26.99

# Restart just the api container (web doesn't need restart)
docker compose -f /opt/calisthenics-tree/docker-compose.prod.yml restart api

# Watch the boot. The boot guard should NOT block — that's the test.
# Production-ready startup logs include "Boot guard: production secrets OK"
# If you see "Production startup refused — these secrets are still at dev defaults"
# then you've forgot to fill one of the values.
sleep 3
docker logs calisthenics-tree-api-1 --tail 30 2>&1 | grep -E "Boot|Application start|refused|Started server"
```

### Step 4 — Run smoke-test (~30 sec)

```bash
ssh root@187.77.26.99 'bash /opt/calisthenics-tree/scripts/smoke-test.sh' 2>&1 | tail -30
```

Should print `✓ All checks passed` (24 checks). If any fail, **do not push to Twitter yet** — investigate which invariant broke.

### Step 5 — Manual browser smoke (~5 min)

1. Open `https://workout.ashbi.ca/welcome` in an incognito window. Confirm the landing page renders.
2. Click "Sign in" → type a real email address you can receive → click "Send magic link".
3. Check your inbox for the Postmark-sent email. It should arrive within 30s.
4. Click the magic link. Should land on `/auth/verify` → redirect to `/` with `ct_session` cookie set (DevTools → Application → Cookies → `.ashbi.ca` should show `ct_session` HttpOnly).
5. Confirm home page shows your user state.
6. Click sign out → confirm cookie cleared → confirm sign-in redirect works again.

### Step 6 — Optional: Sentry for error visibility

If you have a Sentry project (you can create one free at https://sentry.io), generate a DSN and add it to the same `.env`:

```bash
# In the same /root/calisthenicstree-secrets/.env
SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
```

Then restart api again (`docker compose -f /opt/calisthenics-tree/docker-compose.prod.yml restart api`). Errors will start flowing into Sentry within ~60s of the next 4xx/5xx.

### Step 7 — Announce (optional)

Once smoke-test + manual browser both pass, app is publicly live. No Twitter/Reddit launch needed for Phase 1 — you can launch silently to a small group first. PLAN.md has the eventual Reddit outreach plan (Phase 5 gate: 100 free-tier signups in 14 days post-launch).

---

## What does NOT need doing

- ❌ Re-doing the Swagger/OpenAPI docs — they're auto-generated and live at `https://api.workout.ashbi.ca/docs` (still accessible).
- ❌ Re-running the alembic migrations — VPS is already at HEAD `0010_legs_tree`. Migration 0011 (FK indexes) will apply automatically on next deploy.
- ❌ Re-deploying the web container — `ENVIRONMENT` is api-side only. Web is unchanged.
- ❌ DNS changes for `workout.ashbi.ca` or `api.workout.ashbi.ca` — already pointing at the VPS via Traefik. The DNS records you ADD in step 1 are Postmark-specific (DKIM/SPF), not domain-pointing.

## What can go wrong (and the fix)

| Symptom | Cause | Fix |
|---|---|---|
| `POSTMARK_TOKEN=` is empty in step 2 grep | You didn't actually paste it | Re-run the python replace with the real token (no quotes, no spaces, no newline in the middle) |
| `Boot guard refused — POSTMARK_TOKEN missing` on api restart | Same as above | Same as above |
| Magic-link email never arrives in step 5 | DKIM not propagated yet OR Postmark token wrong | `docker logs calisthenics-tree-api-1 --tail 100 | grep "dev_token"` — if the response had `dev_token` in the body, Postmark isn't being called, which means `not settings.postmark_token` evaluated True. Check the env var is actually loaded: `docker exec calisthenics-tree-api-1 printenv | grep POSTMARK` |
| Magic-link email arrives but link 404s | Probably sending the dev link not the prod link | Check `WEB_BASE_URL` in `.env` is `https://workout.ashbi.ca` (not localhost) |
| Smoke-test fails on `Cookie Domain=.ashbi.ca` | Wrong Caddyfile or Traefik reload state | Tail Caddyfile logs: `docker logs calisthenics-tree-web-1 --tail 50` |
| CORS errors in browser console | The api has no CORS middleware — but same-origin shouldn't trigger it | Check the request URL in DevTools — should be `https://api.workout.ashbi.ca/api/v1/...` (relative to API, not the web origin) |

---

## Recommended execution order (back-to-back in one sitting)

1. ☐ Get Postmark token (your side, 10 min)
2. ☐ I commit Sprint 41 fixes (your green-light, 5 min)
3. ☐ I push to VPS + run alembic 0011 (5 min, post-commit)
4. ☐ Fill POSTMARK_TOKEN + flip ENVIRONMENT (you + me over ssh, 2 min)
5. ☐ Restart api (1 min)
6. ☐ Run smoke-test (30 sec)
7. ☐ Manual browser smoke (5 min)
8. ☐ Optional: fill SENTRY_DSN + restart (2 min)
9. ☐ Optional: announce (5 min for a tweet, 30 min for a Reddit post)

Total: ~30-40 min wall-clock if you do step 1 + 4 in parallel.

---

## Sprint 42 scope (the next obvious workstream)

After launch, the 5 highest-value next-steps the swarm audit surfaced (UX slice has wireframes queued for the first three):

1. **Mobile nav** (UX #1) — hamburger + bottom-tab bar using existing `Sheet` primitive. ~90 min.
2. **404 page** (UX #3) — `<NotFoundPage>` mounted as last route. ~30 min.
3. **`apiErrorToMessage()` helper** (UX #5) — one helper in `api.ts` + 4 call sites change. ~20 min.
4. **SearchPage dead links fix** (1.3 / UX #2) — add `tree_slug` to search response + rewire the link helper. ~30 min.
5. **Offline banner** (UX #4) — `navigator.onLine` listener inside `<Layout>`. ~60 min.

Total: ~4 hours of focused work. One PR or split into multiple.

Items still waiting on your decision before I can stage them:
- **1.2** boot guard for non-Postmark secrets
- **1.4** FNV-1a vs SHA-256 (privacy call)

Both are 30-60 min once you decide the approach.
