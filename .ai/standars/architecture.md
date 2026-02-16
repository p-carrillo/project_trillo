# Architecture Standard

## Objective
Define a maintainable, modular architecture for fullstack TypeScript systems in this monorepo.

## Architectural style
- Backend modules follow Hexagonal Architecture.
- Layers are explicit: `domain`, `application`, `infrastructure`, `interfaces`, `test`.
- Frontends live in `/apps` and consume backend contracts/API boundaries.

## Core rules
- Business rules belong in domain/application, never in infrastructure adapters.
- Infrastructure details (DB, queues, HTTP clients, ORM, external SDKs) must remain replaceable.
- Composition is centralized in `/modules/platform` only.
- Cross-module communication must use `packages/contracts` or an explicitly documented public API boundary.
- Architecture decisions must remain executable in Docker-first environments.
- Architecture verification tasks must align with `pnpm` + `turbo` workflows.

## Layer responsibilities
- `domain`: entities, value objects, domain services, repository interfaces.
- `application`: use-cases, orchestration of domain behavior.
- `infrastructure`: adapters, repository implementations, external integrations.
- `interfaces`: delivery/input adapters (HTTP handlers, DTO mapping).
- `test`: module-focused test suites and fixtures.

## Dependency direction
- Always point inward toward domain/application abstractions.
- Do not bypass layer boundaries with shortcut imports.

## Architecture changes
- Significant architecture changes require ADR updates before implementation.
- Any exception to these rules requires explicit ADR approval.
