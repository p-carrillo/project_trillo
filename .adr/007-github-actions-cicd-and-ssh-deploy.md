# GitHub Actions CI/CD with SSH Deployment

## Date
2026-02-19

## Status
Accepted

## Context
The repository had standards that require an enforced quality gate and Docker-first delivery, but there was no automated pipeline in place for pull requests or main branch releases.

This created manual and inconsistent validation/deployment paths, increasing the risk of shipping changes without lint/test/typecheck/build guarantees.

## Decision
- Use GitHub Actions as the CI/CD platform for this repository.
- Add a `quality-gate` job that always runs `pnpm turbo run lint test typecheck build` on Node.js 22 with pnpm workspaces.
- Add a `deploy` job that runs only for `main` push events or manual dispatch after a successful quality gate.
- Deploy by syncing repository content over SSH and starting Docker services remotely with `docker compose -f docker/compose.dev.yml up -d --build`.
- Validate post-deploy health checks against:
  - `http://localhost:3000/health/ready` (backend)
  - `http://localhost:8080/health/live` (web)

## Consequences
Benefits:
- Pull requests and main branch updates are blocked by a deterministic monorepo quality gate.
- Deployments are reproducible and aligned with Docker-first runtime assumptions.
- Release verification includes explicit health checks and container status checks.

Tradeoffs:
- Deployment currently uses `docker/compose.dev.yml` as the runtime baseline on the target server.
- SSH-based deploy requires operational secret management (`DEPLOY_*`) and remote Docker availability.

Follow-up:
- Introduce a dedicated `docker/compose.prod.yml` for stricter production hardening (resource limits, environment isolation, and profile separation) when production requirements grow.

## Alternatives considered
- CI only (without automated deploy):
  - Rejected because it leaves production delivery manual and error-prone.
- Building and publishing images only (without remote rollout):
  - Rejected for now because the current operational model is server-based Docker Compose deployment.
- Non-Docker deployment model:
  - Rejected due to conflict with Docker-first standards and existing ADR decisions.
