# Dependencies Standard

## Principles
- Prefer minimal, well-maintained dependencies.
- Evaluate operational, security, licensing, and maintenance impact.
- Pin and update dependencies in a controlled manner.

## Approval rules
- Significant dependency introductions require an ADR before adoption.
- Significant means high transitive impact, runtime-critical role, security-sensitive role, or lock-in risk.

## Monorepo hygiene
- Use `pnpm workspaces` for dependency management.
- Avoid duplicate dependencies with conflicting major versions without justification.
- Centralize shared tooling versions where practical.

## Docker-first
- Dependency choices must be compatible with containerized builds and runtime images.

## Cross-standard alignment
- Backend runtime dependency wiring occurs at `/modules/platform`.
- Dependency-related checks should execute through `pnpm` + `turbo` tasks.
