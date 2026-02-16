# Backend Standard

## Scope
Backend code lives in `/modules/*` following Hexagonal Architecture, with `/modules/platform` as composition root.

## Core practices
- `platform` is wiring only; no business logic.
- Controllers/adapters are thin; logic belongs in application use-cases.
- Keep clear boundaries between layers and modules.
- Validate input at the edge (HTTP/message handlers).
- Apply consistent error mapping at interface boundaries.
- Avoid side effects in domain code.

## Runtime
The backend runtime is **Node.js 22 LTS**.

Reasons:
- Industry standard.
- Best compatibility.
- Stable Docker support.
- Mature ecosystem.

Alternative runtimes require an ADR.

## HTTP Framework
**Fastify** is the default HTTP framework.

Reasons:
- High performance.
- Excellent TypeScript support.
- Low overhead.
- Good plugin system.

Alternative frameworks require an ADR.

## Container runtime expectations
- Support graceful shutdown on termination signals.
- Provide readiness and liveness/health endpoints where applicable.
- Keep startup deterministic and fail fast on invalid configuration.
- Ensure runtime assumptions are valid inside Docker containers.

## Logging
- Logs must be written to stdout/stderr only.
- Follow `.ai/standars/observability.md` for log structure and telemetry conventions.

## Build and execution alignment
- Backend tasks (`dev`, `lint`, `test`, `typecheck`, `build`) must integrate with `pnpm` + `turbo`.
- Backend runtime assumptions must remain Docker-first and start from `/modules/platform`.
