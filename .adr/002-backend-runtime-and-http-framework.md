# Backend Runtime and HTTP Framework Defaults

## Date
2026-02-16

## Status
Accepted

## Context
The template required stable and widely supported runtime defaults for production and containerized environments. It also needed a high-performance TypeScript-friendly HTTP framework with low operational complexity.

## Decision
- Backend runtime default is Node.js 22 LTS.
- Default HTTP framework is Fastify.
- Alternative runtimes or frameworks require a dedicated ADR.

Rationale:
- Node.js 22 LTS provides strong ecosystem compatibility and stable Docker support.
- Fastify provides high performance, low overhead, strong TypeScript support, and a mature plugin model.

## Consequences
Benefits:
- Predictable developer/runtime environment.
- Strong compatibility with ecosystem tooling and libraries.
- Good performance baseline for APIs.

Tradeoffs:
- Teams preferring other runtimes/frameworks must go through ADR process.
- Some ecosystem libraries/tutorials may assume Express-specific patterns.

Follow-up:
- Review runtime/framework decision periodically as ecosystem and requirements evolve.

## Alternatives considered
- Bun or Deno as default runtime:
  - Rejected as default due to compatibility risk and migration friction for many teams.
- Express as default framework:
  - Rejected in favor of Fastify due to lower overhead and stronger out-of-the-box performance profile.
- Hono/Nest as default framework:
  - Rejected as default to keep baseline minimal and avoid opinionated stack lock-in at template level.
