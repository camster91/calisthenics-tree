# =============================================================================
# Calisthenics Tree — top-level convenience targets
# =============================================================================
#
# Prefer top-level targets over cd-ing into apps/* for everyday workflows.
# `make` (no target) lists what's available.

SHELL := /bin/bash

# Skip slow docker build steps in preflight if SKIP_BUILD=1
SKIP_BUILD ?= 0
export SKIP_BUILD

.PHONY: help preflight deploy test test-api test-web build dev-api dev-web lint \
        format lock-check migrate-up migrate-down logs-shell

help: ## Show this help
	@printf "\nCalisthenics Tree — make targets\n"
	@printf "================================\n"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@printf "\n"

preflight: ## Local preflight — docker, builds, tests, alembic
	./scripts/preflight.sh

deploy: ## Deploy to production VPS (interactive)
	./scripts/deploy-to-vps.sh

test: test-api test-web ## Run all tests

test-api: ## Run FastAPI tests
	cd apps/api && uv run --group dev pytest tests/ -q

test-web: ## Run Playwright E2E + a11y
	cd apps/web && npx playwright test --reporter=line

build: ## Production build of web (docker) + api (docker compose build)
	docker compose build

dev-api: ## Run API locally with hot reload
	cd apps/api && uv run uvicorn calisthenics_api.main:app --reload --port 8000

dev-web: ## Run web locally
	cd apps/web && npm run dev

lint: ## Lint everything
	cd apps/api && uv run --group dev ruff check .
	cd apps/web && npm run lint

migrate-up: ## Apply all pending Alembic migrations
	cd apps/api && uv run alembic upgrade head

migrate-down: ## Roll back one migration
	cd apps/api && uv run alembic downgrade -1

logs-shell: ## SSH into VPS and tail container logs
	ssh root@187.77.26.99 'cd /opt/calisthenicstree && docker compose logs -f --tail=200'