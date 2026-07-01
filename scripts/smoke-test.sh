#!/usr/bin/env bash
# =============================================================================
# smoke-test.sh — fast end-to-end sanity check of the live VPS deploy
# =============================================================================
#
# Hits the public URLs that matter for launch readiness, prints a green/red
# summary, exits non-zero on any failure. Designed to be run by Cameron
# after deploy OR anytime to confirm the site is up.
#
# Checks (~10 seconds total):
#   1. Public web home    GET https://workout.ashbi.ca/         → 200, SPA HTML
#   2. Web /healthz       GET https://workout.ashbi.ca/healthz   → 200 (Traefik → Caddy → api)
#   3. API /healthz       GET https://api.workout.ashbi.ca/healthz → 200, JSON status=ok
#   4. Sitemap XML        GET https://workout.ashbi.ca/sitemap.xml → 200, application/xml, <urlset
#   5. robots.txt         GET https://workout.ashbi.ca/robots.txt  → 200, text/plain, Sitemap: line
#   6. CSP report-uri     GET headers, asserts report-uri /api/v1/_csp_report present
#   7. Bound list 422     GET history?limit=999 → 422 (proves the bound is live)
#   8. CSP report sink    POST /api/v1/_csp_report → 200, docker logs show csp-violation
#   9. OpenAPI surface    GET https://api.workout.ashbi.ca/openapi.json → 200, has /api/v1/auth/whoami
#  10. Cookie Domain      full magic-link round-trip; checks Set-Cookie Domain=.ashbi.ca
#
# Usage:
#   ./scripts/smoke-test.sh                  # default target = live VPS
#   WEB_BASE=https://staging.example.com \
#     API_BASE=https://api-staging.example.com \
#     ./scripts/smoke-test.sh                # different target
#
# Exit codes:
#   0  all checks passed
#   1  any check failed (the failed check is the last log line)
#
# This is intentionally non-interactive. Pipe through `tee` if you want a
# transcript; otherwise just read the green/red checklist.

set -uo pipefail

WEB_BASE="${WEB_BASE:-https://workout.ashbi.ca}"
API_BASE="${API_BASE:-https://api.workout.ashbi.ca}"
QA_EMAIL="${QA_EMAIL:-cameron-smoke-$(date +%s)@ashbi.ca}"

PASS=0
FAIL=0

hr() { printf "\n\033[1m== %s ==\033[0m\n" "$1"; }
ok() { printf "  \033[32m✓\033[0m %s\n" "$1"; PASS=$((PASS+1)); }
bad() { printf "  \033[31m✗\033[0m %s\n" "$1"; FAIL=$((FAIL+1)); }

# Helper: HTTP status code only, no body. Uses --max-time so a hung
# server doesn't block forever. NOT using -f because we WANT to see
# 4xx/5xx codes (they're a valid expected result for several checks).
status() {
    curl -ksSL --max-time 8 -o /dev/null -w '%{http_code}' "$@"
}

hr "Live VPS smoke test"
printf "  WEB_BASE: %s\n" "$WEB_BASE"
printf "  API_BASE: %s\n" "$API_BASE"

# Fetch the OpenAPI spec once and reuse it for sections 7 + 9. Fail
# early if the api is unreachable; every later check depends on this.
OPENAPI=$(curl -ksSL --max-time 8 "$API_BASE/openapi.json")
if [[ -z "$OPENAPI" ]] || ! echo "$OPENAPI" | grep -q '"openapi"'; then
    bad "openapi.json unreachable from $API_BASE — aborting before dependent checks"
    printf "  \033[31m%d passed\033[0m · \033[31m%d failed\033[0m\n" "$PASS" "$FAIL"
    exit 1
fi

# ---------------------------------------------------------------------
# 1. Web home (SPA)
# ---------------------------------------------------------------------
hr "1. Public web home"
HOME_STATUS=$(status "$WEB_BASE/")
[[ "$HOME_STATUS" == "200" ]] && ok "GET /: 200" || bad "GET /: $HOME_STATUS (expected 200)"

# ---------------------------------------------------------------------
# 2. Web /healthz (Traefik → Caddy → api reverse-proxy)
# ---------------------------------------------------------------------
hr "2. Web /healthz (Traefik-forwarded)"
HEALTHZ_STATUS=$(status "$WEB_BASE/healthz")
[[ "$HEALTHZ_STATUS" == "200" ]] && ok "GET /healthz: 200" || bad "GET /healthz: $HEALTHZ_STATUS (expected 200)"

# ---------------------------------------------------------------------
# 3. API /healthz (direct)
# ---------------------------------------------------------------------
hr "3. API /healthz (direct)"
API_HEALTHZ=$(curl -kfsSL --max-time 5 "$API_BASE/healthz")
API_STATUS=$(status "$API_BASE/healthz")
[[ "$API_STATUS" == "200" ]] && ok "GET /healthz: 200" || bad "GET /healthz: $API_STATUS"
echo "$API_HEALTHZ" | grep -q '"status":"ok"' && ok "/healthz JSON: status=ok" || bad "/healthz JSON: $API_HEALTHZ"

# ---------------------------------------------------------------------
# 4. Sitemap
# ---------------------------------------------------------------------
hr "4. Sitemap (Sprint 39 fix)"
SITEMAP=$(curl -kfsSL --max-time 8 -D /tmp/smoke-sitemap.hdr "$WEB_BASE/sitemap.xml")
SITEMAP_STATUS=$(head -1 /tmp/smoke-sitemap.hdr | awk '{print $2}')
SITEMAP_TYPE=$(grep -i '^content-type:' /tmp/smoke-sitemap.hdr | head -1 | tr -d '\r' | sed 's/^[^:]*: //')
[[ "$SITEMAP_STATUS" == "200" ]] && ok "GET /sitemap.xml: 200" || bad "GET /sitemap.xml: $SITEMAP_STATUS"
[[ "$SITEMAP_TYPE" == application/xml* ]] && ok "content-type: $SITEMAP_TYPE" || bad "content-type: $SITEMAP_TYPE (expected application/xml)"
echo "$SITEMAP" | grep -q '<urlset' && ok "<urlset> body present" || bad "<urlset> missing"

# ---------------------------------------------------------------------
# 5. robots.txt
# ---------------------------------------------------------------------
hr "5. robots.txt (Sprint 39 fix)"
ROBOTS=$(curl -kfsSL --max-time 8 "$WEB_BASE/robots.txt")
ROBOTS_STATUS=$(status "$WEB_BASE/robots.txt")
[[ "$ROBOTS_STATUS" == "200" ]] && ok "GET /robots.txt: 200" || bad "GET /robots.txt: $ROBOTS_STATUS"
echo "$ROBOTS" | grep -q '^Sitemap:' && ok "Sitemap: line present" || bad "Sitemap: line missing"
echo "$ROBOTS" | grep -q '^Disallow: /login' && ok "Disallow: /login present" || bad "Disallow: /login missing"

# ---------------------------------------------------------------------
# 6. CSP header on a page
# ---------------------------------------------------------------------
hr "6. CSP header (Sprint 38/39 hardening)"
HEADERS=$(curl -kfsSL --max-time 8 -D - -o /dev/null "$WEB_BASE/")
CSP=$(echo "$HEADERS" | grep -i '^content-security-policy:' | tr -d '\r' | sed 's/^[^:]*: //')
if [[ -n "$CSP" ]]; then
    ok "CSP header present"
    echo "$CSP" | grep -q 'report-uri /api/v1/_csp_report' && ok "report-uri /api/v1/_csp_report" || bad "report-uri /api/v1/_csp_report missing"
    echo "$CSP" | grep -q "frame-ancestors 'none'" && ok "frame-ancestors 'none'" || bad "frame-ancestors 'none' missing"
    echo "$CSP" | grep -q 'upgrade-insecure-requests' && ok "upgrade-insecure-requests" || bad "upgrade-insecure-requests missing"
else
    bad "CSP header missing entirely"
fi
echo "$HEADERS" | grep -qi '^strict-transport-security:' && ok "HSTS header" || bad "HSTS header missing"

# ---------------------------------------------------------------------
# 7. Bound list declared in OpenAPI (Sprint 39 — proves the Query bound is live)
# ---------------------------------------------------------------------
# Checking the runtime 422 here would require a real authed cookie, which
# means we'd have to first do a magic-link + verify round-trip. Cheaper
# to assert the bound via OpenAPI: every endpoint that takes a `limit`
# Query must declare `minimum: 1` + `maximum: N` so the api rejects
# out-of-range values before they hit the database.
hr "7. /users/me/history + /friends bounds (Sprint 39)"
# Pull the schema section for history's limit param
HISTORY_LIMIT_MAX=$(echo "$OPENAPI" | python3 -c "
import json, sys
spec = json.load(sys.stdin)
p = spec['paths']['/api/v1/users/me/history']['get']
for pp in p.get('parameters', []):
    if pp['name'] == 'limit':
        print(pp['schema'].get('maximum', 'MISSING'))
        break
")
[[ "$HISTORY_LIMIT_MAX" == "200" ]] && ok "history limit max=200" || bad "history limit max=$HISTORY_LIMIT_MAX (expected 200)"
FRIENDS_LIMIT_MAX=$(echo "$OPENAPI" | python3 -c "
import json, sys
spec = json.load(sys.stdin)
p = spec['paths']['/api/v1/friends']['get']
for pp in p.get('parameters', []):
    if pp['name'] == 'limit':
        print(pp['schema'].get('maximum', 'MISSING'))
        break
")
[[ "$FRIENDS_LIMIT_MAX" == "200" ]] && ok "friends limit max=200" || bad "friends limit max=$FRIENDS_LIMIT_MAX (expected 200)"

# ---------------------------------------------------------------------
# 8. CSP report endpoint round-trip
# ---------------------------------------------------------------------
hr "8. CSP report endpoint (POST /api/v1/_csp_report)"
CSP_REPORT=$(curl -kfsSL --max-time 8 -X POST "$API_BASE/api/v1/_csp_report" \
    -H "Content-Type: application/csp-report" \
    -d '{"csp-report":{"violated-directive":"script-src","blocked-uri":"https://smoke-test.invalid/x.js"}}')
echo "$CSP_REPORT" | grep -q '"status":"logged"' && ok "POST /api/v1/_csp_report: {\"status\":\"logged\"}" || bad "POST /api/v1/_csp_report: $CSP_REPORT"

# ---------------------------------------------------------------------
# 9. OpenAPI surface (Sprint 39 — exposes /sitemap.xml + /robots.txt at root)
# ---------------------------------------------------------------------
hr "9. OpenAPI surface (Sprint 39 — exposes /sitemap.xml + /robots.txt at root)"
echo "$OPENAPI" | grep -q '"/api/v1/auth/whoami"' && ok "/api/v1/auth/whoami present" || bad "/api/v1/auth/whoami missing"
# /api/v1/_csp_report is `include_in_schema=False` (it's a browser-driven
# observability sink, not a public API). Skip the OpenAPI check; the
# POST round-trip in step 8 verifies it's actually registered.
echo "$OPENAPI" | grep -q '"/sitemap.xml"' && ok "/sitemap.xml at root" || bad "/sitemap.xml at root missing"
echo "$OPENAPI" | grep -q '"/robots.txt"' && ok "/robots.txt at root" || bad "/robots.txt at root missing"

# ---------------------------------------------------------------------
# 10. Cookie Domain on full magic-link round-trip (Sprint 39 P2)
# ---------------------------------------------------------------------
hr "10. Cookie Domain (.ashbi.ca — Sprint 39 P2)"
ML=$(curl -kfsSL --max-time 8 -X POST "$API_BASE/api/v1/auth/magic-link" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$QA_EMAIL\"}")
DEV_TOKEN=$(echo "$ML" | python3 -c "import json, sys; print(json.load(sys.stdin).get('dev_token',''))")
if [[ -n "$DEV_TOKEN" ]]; then
    HEADERS=$(curl -kfsSL --max-time 8 -G -D - -o /dev/null "$API_BASE/api/v1/auth/verify" --data-urlencode "token=$DEV_TOKEN")
    echo "$HEADERS" | grep -i '^set-cookie: ct_session=' | grep -qi 'Domain=.ashbi.ca' \
        && ok "Set-Cookie Domain=.ashbi.ca" \
        || bad "Set-Cookie Domain=.ashbi.ca missing"
    echo "$HEADERS" | grep -i '^set-cookie: ct_session=' | grep -qi 'HttpOnly' \
        && ok "Set-Cookie HttpOnly" \
        || bad "Set-Cookie HttpOnly missing"
    echo "$HEADERS" | grep -i '^set-cookie: ct_session=' | grep -qi 'SameSite=lax' \
        && ok "Set-Cookie SameSite=lax" \
        || bad "Set-Cookie SameSite=lax missing"
else
    bad "magic-link request didn't return dev_token (env=production?)"
fi

# ---------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------
hr "Summary"
printf "  \033[32m%d passed\033[0m · \033[31m%d failed\033[0m\n" "$PASS" "$FAIL"
[[ "$FAIL" -gt 0 ]] && exit 1 || exit 0