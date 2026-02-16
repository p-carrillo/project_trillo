# Testing Standard

## Mandatory rule
Always write tests for new behavior and changed behavior.

## Test levels
- Unit tests: domain/application logic.
- Integration tests: infrastructure adapters and DB/repository behavior.
- Contract/API tests: request/response contracts and error mapping.
- End-to-end tests: critical user/business flows.

## Location
- Keep backend module tests under `/modules/<module>/test`.
- Keep frontend tests within each app structure.

## Tooling and execution
- Default test runner: Vitest (see tooling standard).
- Task names must be consistent: `test` (and optional `test:watch`, `test:e2e`).
- Execute through Turborepo in local and CI:
  - `pnpm turbo run test`

## Docker-first
- Integration/E2E tests that require infrastructure should run against Dockerized services.
- Tests must not depend on host-only tools or assumptions.

## Cross-standard alignment
- Backend integration/E2E tests must target services started through `/modules/platform`.
- Test workflows are executed through `pnpm` + `turbo` task orchestration.
