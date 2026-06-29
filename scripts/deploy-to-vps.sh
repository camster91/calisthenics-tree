#!/usr/bin/env bash
# =============================================================================
# deploy-to-vps.sh — one-shot production deploy to Ashbi VPS
# =============================================================================
#
# Usage (from a local machine with ssh access to the VPS):
#   ./scripts/deploy-to-vps.sh
#
# Assumes:
#   - VPS reachable as root@187.77.26.99 (or set VPS_HOST)
#   - Traefik is already running on the VPS (per the existing infra pattern)
#   - /root/calisthenicstree-secrets/.env already exists (sourced from
#     scripts/.env.production.example, copied over ssh)
#   - DNS for workout.ashbi.ca (wildcard at *.ashbi.ca) points at the VPS.
#     Traefik on the host routes workout.ashbi.ca → web:80 in this
#     compose via Docker labels.
#
# What this does:
#   1. Run preflight.sh locally (validates docker build + tests)
#   2. rsync the repo to /opt/calisthenicstree/ on the VPS
#   3. SSH in and:
#        - source /root/calisthenicstree-secrets/.env
#        - pull the new image (or source-build)
#        - run docker compose up -d --no-deps --build
#        - tail logs for the first 30 seconds to catch startup errors
#        - curl /healthz on the new api to confirm
#
# CHAT-LAYER REDACTION: this script NEVER inlines secrets in commands. All
# secrets live at /root/calisthenicstree-secrets/.env on the VPS. The
# script sources them via 'set -a; source ...' so they're exported as
# environment variables to docker compose, not interpolated into command
# strings. If you find yourself adding `${SECRET}` to a heredoc, stop
# and pass it via env file instead.

set -euo pipefail

cd "$(dirname "$0")/.."

VPS_HOST="${VPS_HOST:-root@187.77.26.99}"
# Repo lives on the VPS at /opt/calisthenics-tree/ (with hyphen, matching
# the GitHub repo name). The hyphen-less /opt/calisthenicstree/ path was
# a typo from when this script was first written.
VPS_DEPLOY_DIR="${VPS_DEPLOY_DIR:-/opt/calisthenics-tree}"
VPS_SECRETS_DIR="${VPS_SECRETS_DIR:-/root/calisthenicstree-secrets}"
REMOTE_REPO="${REMOTE_REPO:-https://github.com/camster91/calisthenics-tree.git}"
REMOTE_BRANCH="${REMOTE_BRANCH:-main}"

hr() { printf "\n\033[1m== %s ==\033[0m\n" "$1"; }
log() { printf "  %s\n" "$1"; }

hr "Preflight"
if ! ./scripts/preflight.sh; then
    log "Preflight failed. Fix issues above before deploying."
    exit 1
fi

hr "Confirm deploy"
printf "  Target:    %s\n" "$VPS_HOST"
printf "  Deploy at: %s\n" "$VPS_DEPLOY_DIR"
printf "  Secrets:   %s\n" "$VPS_SECRETS_DIR"
printf "  Repo:      %s @ %s\n" "$REMOTE_REPO" "$REMOTE_BRANCH"
printf "  Continue? [y/N] "
read -r answer
[[ "$answer" == "y" || "$answer" == "Y" ]] || { log "Aborted."; exit 1; }

hr "Syncing repo to VPS"
ssh "$VPS_HOST" bash -s <<EOF
set -e
if [[ -d "$VPS_DEPLOY_DIR/.git" ]]; then
    cd "$VPS_DEPLOY_DIR"
    git fetch origin "$REMOTE_BRANCH"
    git reset --hard "origin/$REMOTE_BRANCH"
else
    mkdir -p "$(dirname "$VPS_DEPLOY_DIR")"
    git clone --branch "$REMOTE_BRANCH" --depth 1 "$REMOTE_REPO" "$VPS_DEPLOY_DIR"
fi
EOF
log "Repo synced to $VPS_DEPLOY_DIR"

hr "Restarting services on VPS"
ssh "$VPS_HOST" bash -s <<EOF
set -e
cd "$VPS_DEPLOY_DIR"

# Source the secrets (NEVER inline them into a command — see file header)
if [[ ! -f "$VPS_SECRETS_DIR/.env" ]]; then
    echo "  ERROR: $VPS_SECRETS_DIR/.env not found on VPS." >&2
    echo "  Copy scripts/.env.production.example and fill in real values:" >&2
    echo "    scp scripts/.env.production.example \$VPS_HOST:$VPS_SECRETS_DIR/.env" >&2
    exit 1
fi

set -a
source "$VPS_SECRETS_DIR/.env"
set +a

# Build images + restart in place. --no-deps avoids a brief outage
# from the api container being torn down before the new one starts.
# Uses docker-compose.prod.yml (TLS, named volumes, resource limits)
# rather than docker-compose.yml (local dev shape).
# We use --env-file explicitly because `docker compose` does NOT inherit
# `set -a; source .env` shell vars — it spawns sub-shells for interpolation,
# so the secret exports don't reach the compose resolver. With --env-file
# the secrets travel inside the docker compose process boundary.
docker compose -f docker-compose.prod.yml --env-file "$VPS_SECRETS_DIR/.env" \
    pull --ignore-pull-failures || true
docker compose -f docker-compose.prod.yml --env-file "$VPS_SECRETS_DIR/.env" \
    build --pull
docker compose -f docker-compose.prod.yml --env-file "$VPS_SECRETS_DIR/.env" \
    up -d --no-deps --remove-orphans
docker image prune -f
EOF
log "Containers restarted."

hr "Smoke test"
log "Waiting 5s for services to settle..."
sleep 5

HEALTH=$(ssh "$VPS_HOST" "docker compose -f $VPS_DEPLOY_DIR/docker-compose.prod.yml exec -T api \
    python -c \"import urllib.request; print(urllib.request.urlopen('http://localhost:8000/healthz', timeout=3).read().decode())\"")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    log "/healthz: ok"
else
    log "/healthz UNEXPECTED: $HEALTH"
    log "Tail api logs:"
    ssh "$VPS_HOST" "docker compose -f $VPS_DEPLOY_DIR/docker-compose.prod.yml logs --tail=30 api"
    exit 1
fi

WEB=$(ssh "$VPS_HOST" "curl -fsS -o /dev/null -w '%{http_code}' http://localhost/healthz || true")
if [[ "$WEB" == "200" ]]; then
    log "Web /healthz: 200"
else
    log "Web /healthz unexpected: $WEB"
    exit 1
fi

hr "Done"
log "Deployment complete. Public URL: https://workout.ashbi.ca"
log "If something looks off: ssh $VPS_HOST 'cd $VPS_DEPLOY_DIR && docker compose -f docker-compose.prod.yml logs -f --tail=200'"