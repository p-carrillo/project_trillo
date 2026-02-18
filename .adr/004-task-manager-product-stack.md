# Task Manager Product Stack and Delivery Baseline

## Date
2026-02-17

## Status
Accepted

## Context
The repository had governance and standards but no executable product code. Building the task manager required concrete implementation choices for frontend runtime, backend persistence, and contract strategy.

These choices affect long-term maintainability, Docker parity, and cross-layer boundaries.

## Decision
- Implement the frontend app in `/apps/web` using React + Vite + TypeScript.
- Keep backend composition root in `/modules/platform` with Fastify, while feature logic lives in `/modules/tasks` using hexagonal layers.
- Use MariaDB as persistence engine with SQL repository implementation inside `tasks/infrastructure`.
- Define and maintain API contract in `/packages/contracts/openapi/trillo.v1.yaml` and shared DTOs in `/packages/contracts/src/types.ts`.
- Keep Docker-first execution with local stack in `docker/compose.dev.yml`.

## Consequences
Benefits:
- Fast frontend development with typed components and clear build pipeline.
- Backend stays aligned with existing ADR decisions (Node.js 22 + Fastify + composition root in platform).
- Persistence concerns are isolated in repository implementations, preserving domain/application purity.
- API stability improves through explicit contracts shared between backend and frontend.
- Local parity improves via Dockerized MariaDB + backend + frontend.

Tradeoffs:
- Added build/tooling complexity compared to a single-package prototype.
- SQL maintenance requires explicit migration discipline.

## Alternatives considered
- Next.js for frontend:
  - Rejected for this iteration to keep runtime and deployment model simpler while still meeting UX requirements.
- In-memory backend without database:
  - Rejected because task manager behavior needs persistence and standards define MariaDB as default database.
- Skipping contracts package and relying on ad-hoc DTOs:
  - Rejected due to increased drift risk between frontend and backend.
