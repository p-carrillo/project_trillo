# Users Feature Specs

## Objective
Define an implementation plan for users and JWT authentication in small deliverable units aligned with `.ai/standars` and `AGENTS.md`.

## Global Constraints
- Strict Hexagonal Architecture in the backend.
- `/modules/platform` remains the single composition root.
- Shared contracts in `packages/contracts`.
- Docker-first execution and verification.
- Minimalist UI in black and white with straight corners.
- No email delivery in registration flow.

## Deliverable Units
1. `USR-01` - ADR for authentication, tenancy, and user routes.
2. `USR-02` - API contracts and shared types for auth/user.
3. `USR-03` - Identity backend module + JWT.
4. `USR-04` - Per-user data isolation and authorization in tasks/projects.
5. `USR-05` - Login and register frontend pages.
6. `USR-06` - Per-user URL + profile side panel.
7. `USR-07` - Testing strategy, quality gate, and rollout.
8. `USR-08` - Refresh-token session strategy (post-wave scope).

## Recommended Sequence
`USR-01 -> USR-02 -> USR-03 -> USR-04 -> USR-05 -> USR-06 -> USR-07`

## Deliverable Unit Definition
Each spec is considered closed when:
- Its full scope is implemented.
- Its minimum tests pass.
- It leaves no technical blockers for the next unit.
