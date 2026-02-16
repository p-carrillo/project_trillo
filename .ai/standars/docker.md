# Docker Standard

## Core principles
- Docker-first: local development and production should share the same container images where possible.
- Use multi-stage builds for production images.
- Keep images small and minimize attack surface.
- Containers are immutable; no manual runtime modifications.
- Configuration is provided through environment variables (see configuration standard).
- Healthchecks are required for services.
- Proper signal handling and graceful shutdown are mandatory.

## Repository expectations
- Use Docker Compose for local development.
- A production-like Compose example may be provided where useful.
- Typical services:
  - MariaDB
  - Backend runtime (must start from `modules/platform`)
  - Frontend app containers (if applicable)
  - Reverse proxy (if needed)
- Define network and volume strategy explicitly.
- Persist database data using named volumes.
- Avoid host-mounted `node_modules` patterns that break Linux containers.

## Backend container requirements
- Backend entrypoint MUST be the platform module composition root.
- Expose ports through environment-based configuration.
- Logs must go to stdout/stderr only (see observability standard).

## Frontend container requirements
- For deployed frontends, build in one stage and serve static output with a minimal server (e.g., nginx/caddy) or required Node runtime.
- For SEO/SSR apps, document runtime server/container requirements explicitly.

## Production guidance
- Secrets are never stored in images or committed files.
- Use non-root users where possible.
- Pin base images and dependencies.
- Define and document image and dependency upgrade strategy.

## Expected Docker files (to be created later)
- `/docker/compose.dev.yml`
- `/docker/compose.prod.example.yml` (optional)
- `Dockerfile` files per deployable service/app/module as needed.

## Naming conventions
- Compose files: `compose.<environment>.yml`.
- Images: `<project>-<service>:<tag>`.
- Env files: `.env`, `.env.local`, `.env.<environment>` (never commit secrets).

## Build orchestration alignment
- Docker-related verify/build tasks in monorepo pipelines should be callable through `pnpm` + `turbo`.
