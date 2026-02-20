# USR-07 - Testing, Quality Gate, And Rollout

## Objective
Close the users feature with full validation and clear exit criteria.

## Deliverable Unit
Technical quality evidence and safe deployment plan.

## Scope
- Test matrix by layer:
  - users domain/application
  - users repositories
  - tasks tenancy
  - HTTP contracts
  - frontend auth/profile flows
- Verify Docker-first compatibility.
- Validate observability and error mapping for auth/authorization.
- Run the mandatory full quality gate:
  - `pnpm turbo run lint test typecheck build`
- If backend changes were made in `/modules`, rebuild/restart containers before manual verification.

## Out Of Scope
- New features.
- Product changes unrelated to users.

## Acceptance Criteria
1. All relevant suites pass locally.
2. Full quality gate passes without skips.
3. `AGENTS.md` checklist is covered.
4. Open risks are documented in a rollout note.

## Minimum Tests
- Actual execution of `pnpm turbo run lint test typecheck build`.
- Manual flow test:
  - register -> login -> workspace `/u/:username` -> edit profile -> logout/login.

## Dependencies
- Requires `USR-04`, `USR-05`, and `USR-06`.
