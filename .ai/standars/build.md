# Build System Standard

## Hard choices
- Package manager: **pnpm workspaces**.
- Task runner/build orchestration: **Turborepo**.

## Why
- Fast installation and efficient disk usage.
- Strong monorepo-native workflow.
- Deterministic, cache-aware task orchestration.
- Scales well across apps, modules, and shared packages.
- Supports Docker-first local/CI workflows with reproducible task execution.
- Supports backend composition-root enforcement through `/modules/platform` task wiring.

## Required script conventions
All workspaces must expose consistent script names:
- `dev`
- `build`
- `test`
- `lint`
- `typecheck`

## Turbo pipeline approach
- Define pipelines centrally in `turbo.json`.
- Express task dependencies explicitly (e.g., `build` depends on upstream `build`, `test` may depend on `build` where needed).
- Keep tasks deterministic to maximize cache hits.

## Caching expectations
Can usually be cached:
- `build`
- `lint`
- `typecheck`
- unit tests (when deterministic)

Must not be blindly cached:
- tasks with external side effects (deploy, publish, mutable integration steps)
- tasks that depend on non-versioned external state without stable inputs

## CI usage
CI should call:
```bash
pnpm turbo run lint test typecheck build
```

## Adding new tasks
- Add tasks only when there is clear recurring value.
- Use consistent naming conventions across all workspaces.
- Update `turbo.json` and relevant package scripts together.
- Document non-obvious task behavior in standards or ADRs.

## Alternatives
Alternatives (`Nx`, `Moonrepo`, `pnpm-only`) require an ADR.
