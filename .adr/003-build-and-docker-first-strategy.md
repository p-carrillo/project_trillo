# Build System and Docker-First Strategy

## Date
2026-02-16

## Status
Accepted

## Context
The template needed a monorepo-native build system with consistent task orchestration, caching, and CI ergonomics. It also required local and production workflows to align around containers to reduce environment drift.

## Decision
- Package manager default is pnpm workspaces.
- Monorepo task orchestration default is Turborepo.
- Standard scripts across workspaces are mandatory: `dev`, `build`, `test`, `lint`, `typecheck`.
- CI baseline command is `pnpm turbo run lint test typecheck build`.
- Docker-first is mandatory for local and production-oriented workflows.
- Backend containers must start from `modules/platform`.
- Docker images should use multi-stage builds, healthchecks, immutable runtime behavior, and stdout/stderr logging.
- Alternatives (Nx, Moonrepo, pnpm-only orchestration, non-Docker-first workflow) require ADR.

## Consequences
Benefits:
- Faster monorepo execution and better cache reuse.
- Consistent developer and CI task model.
- Reduced "works on my machine" issues via container parity.
- Clear production path from local workflows.

Tradeoffs:
- Teams must align tooling and scripts to template conventions.
- Docker-first adds initial setup complexity for simple prototypes.

Follow-up:
- Define and maintain `turbo.json` pipelines as repo grows.
- Keep Dockerfiles and compose definitions aligned with standards.

## Alternatives considered
- Nx as default:
  - Rejected for this template baseline to keep setup leaner while still getting strong orchestration with Turborepo.
- Moonrepo as default:
  - Rejected due to lower familiarity in many teams and ecosystem preference for Turbo in this context.
- pnpm scripts without orchestrator:
  - Rejected due to weaker cross-workspace task graph and caching capabilities.
- Non-Docker-first local workflow:
  - Rejected due to environment drift risk and reduced production parity.
