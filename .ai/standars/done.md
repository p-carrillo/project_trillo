# Definition of Done Standard

A change is done only when all conditions are met:

- Scope and behavior are documented and aligned with standards.
- Required ADRs are created/updated for relevant decisions.
- Code follows architecture/layer/module rules.
- Tests are implemented/updated and passing.
- Lint, typecheck, and build are passing.
- Docker runtime assumptions are validated.
- Observability and error handling follow standards.
- Reviewer checklist in `/AGENTS.md` is satisfied.

## Cross-standard alignment
- Backend runtime entrypoint remains `/modules/platform`.
- Delivery criteria must pass in Docker-first workflows.
- Required checks are executed through `pnpm` + `turbo`.
