# syntax=docker/dockerfile:1.6
# =============================================================================
# Stage 1 — install + build the static SPA
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY apps/web/package.json apps/web/package-lock.json ./

# Use ci for reproducible installs; --ignore-scripts so postinstall doesn't
# run theme:build before .generated/ is wired up (theme:build runs as part
# of `npm run build` anyway).
#
# --legacy-peer-deps is required: the project pins typescript@~6.0.2 but
# react-i18next@15.7.4 declares a peer dep on typescript@^5. The lockfile
# pins a known-working resolution (typescript 6.0.3 + react-i18next 15.7.4
# compile cleanly in dev), but npm 11's strict peer-dep resolver refuses
# the install without this flag. Confirmed working locally — the strict
# peer warning is noise, not a real conflict.
RUN npm ci --ignore-scripts --legacy-peer-deps

# Copy the rest of the web app
COPY apps/web/ ./

# Generate the theme.css bundle (postinstall normally handles this; we
# skipped it above). Then run the production build.
RUN npm run theme:build && npm run build

# =============================================================================
# Stage 2 — serve the static bundle with Caddy
# =============================================================================
FROM caddy:2-alpine AS runtime

# SPA fallback: send all unknown routes to index.html so React Router can
# handle them client-side. /api/* is reverse-proxied to the api service
# (docker-network DNS resolves `api` to the api container).
COPY apps/web/Caddyfile /etc/caddy/Caddyfile

# Static assets
COPY --from=builder /app/dist /srv

EXPOSE 80

# Caddy auto-TLS via ACME when the public hostname is reachable; for local
# dev, runs plain HTTP on :80.
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD wget -qO- http://localhost:80/healthz || exit 1