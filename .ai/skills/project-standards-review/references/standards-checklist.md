# Standards Checklist

Use this checklist to decide which standards to load based on changed paths.

## Always load

- `AGENTS.md`
- `.ai/standars/done.md`

## Backend changes (`/modules/**`)

Load at minimum:
- `.ai/standars/backend.md`
- `.ai/standars/architecture.md`
- `.ai/standars/repo-structure.md`
- `.ai/standars/api.md`
- `.ai/standars/database.md`
- `.ai/standars/errors.md`
- `.ai/standars/observability.md`
- `.ai/standars/test.md`
- `.ai/standars/docker.md`

Validate:
- `platform` is wiring only and remains composition root.
- no business logic in interfaces/infrastructure glue.
- no DB access outside repositories.
- repository contracts live in domain.
- cross-module imports use `packages/contracts` or documented boundary.
- tests exist for changed behavior.

## Frontend changes (`/apps/**`)

Load at minimum:
- `.ai/standars/frontend.md`
- `.ai/standars/architecture.md`
- `.ai/standars/repo-structure.md`
- `.ai/standars/api.md`
- `.ai/standars/seo.md`
- `.ai/standars/performance.md`
- `.ai/standars/test.md`
- `.ai/standars/docker.md`

Validate:
- accessibility requirements are preserved.
- API usage respects contracts and boundary rules.
- destructive actions use shared in-app confirmation pattern.
- tests cover new/changed behavior.

## Shared/package/build changes (`/packages/**`, tooling, Docker)

Load as applicable:
- `.ai/standars/dependencies.md`
- `.ai/standars/security.md`
- `.ai/standars/tooling.md`
- `.ai/standars/build.md`
- `.ai/standars/configuration.md`
- `.ai/standars/docker.md`

Validate:
- no significant dependency added without ADR.
- CI/build/test tasks still align with `pnpm` + `turbo`.
- Docker-first assumptions remain valid.

## ADR trigger checks

Require ADR creation or update when changes:
- introduce/replace key frameworks or runtimes.
- modify module boundaries or dependency rules.
- add significant dependencies.
- change database/API/deployment strategy.
- add exceptions to standards.
