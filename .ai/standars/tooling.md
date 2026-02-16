# Tooling Standard

## Required tooling
- TypeScript (`strict: true`).
- ESLint for static analysis.
- Prettier for formatting.
- Vitest as default test runner.

## Required commands
Every workspace should provide consistent scripts compatible with Turborepo:
- `dev`
- `build`
- `test`
- `lint`
- `typecheck`

## Expected command patterns
- Format: `pnpm prettier --check .` (or package-scoped equivalent).
- Lint: `pnpm eslint .` (or package-scoped equivalent).
- Typecheck: `tsc --noEmit` via `pnpm run typecheck`.
- Test: `vitest run` via `pnpm run test`.

## Turborepo compatibility
- Scripts must be deterministic for caching where applicable.
- Avoid scripts with hidden side effects that invalidate cache usefulness.
- Keep script names consistent across apps/modules/packages.

## Exceptions
Alternative tools or deviations require an ADR.

## Cross-standard alignment
- Tooling must support Docker-first execution environments.
- Backend tooling conventions must preserve `/modules/platform` as the composition root entrypoint.
