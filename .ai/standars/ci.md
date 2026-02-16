# CI Standard

## Objectives
- Fast feedback.
- Reproducible builds.
- Enforced quality gates.

## Baseline pipeline
CI must run monorepo tasks using Turborepo:
```bash
pnpm turbo run lint test typecheck build
```

## CI expectations
- Use Node.js 22 LTS.
- Use `pnpm` workspaces.
- Enable Turborepo cache strategy (local/remote depending on platform).
- Fail pipeline on lint, test, typecheck, or build errors.

## Docker alignment
- Build and validate Docker images in CI for production-targeted services.
- Ensure backend image starts from `/modules/platform` composition root.

## Change control
- Architectural/runtime/build/dependency changes require ADR checks as part of review.
