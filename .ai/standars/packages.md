# Packages Standard

## Purpose
Define shared package responsibilities and boundaries.

## Package roles
- `/packages/shared`: reusable utilities and shared technical building blocks.
- `/packages/contracts`: cross-module/app contracts (DTOs, schemas, client/server contracts).

## Rules
- Keep contracts stable and version-aware.
- Do not place business use-cases in shared packages.
- Do not leak infrastructure-specific concerns into `contracts`.
- Cross-module communication should prefer `contracts` over direct internals imports.

## Build and tooling
- Packages must expose consistent scripts: `build`, `test`, `lint`, `typecheck`.
- Scripts must integrate with Turborepo.
- Keep dependency graphs minimal and explicit.

## Cross-standard alignment
- Contracts consumed by backend are wired through `/modules/platform` at runtime.
- Shared packages must remain Docker-compatible in build and runtime contexts.
