# Authentication, Per-User Tenancy, And User Workspace Routing

## Date
2026-02-19

## Status
Accepted

## Context
The platform currently exposes task/project APIs without account identity and without data ownership isolation. The users feature requires:
- Register/login/me flows.
- Per-user data isolation for projects/tasks.
- Canonical user workspace URLs (`/u/:username`).
- Compatibility with HTTP API and MCP runtime.

`AGENTS.md` and standards require hexagonal boundaries, `/modules/platform` as sole backend composition root, Docker-first behavior, and ADR coverage for architectural decisions.

## Decision
- Introduce `modules/users` as a backend hexagonal module with layers: `domain`, `application`, `infrastructure`, `interfaces`, `test`.
- Keep `/modules/platform` as the only composition root; it wires `users` and `tasks` services and routes.
- Use JWT bearer access tokens for HTTP auth (`Authorization: Bearer <token>`).
- JWT claims: `sub`, `username`, `iat`, `exp`.
- Access token expiration: 24 hours.
- Password hashing strategy: Node.js `scrypt` with per-password random salt.
- Enforce per-user tenancy by ownership on `projects.owner_user_id` and filtering task/project operations by authenticated `userId`.
- Cross-user access to resources must return safe not-found semantics (`404`) instead of exposing ownership metadata.
- Canonical authenticated frontend route is `/u/:username`; if URL username mismatches session username, redirect to session canonical URL.
- MCP runtime operates in user scope. MCP startup must receive a valid access token and execute tools under that authenticated user context.
- Refresh token flow is deferred to a dedicated spec (`USR-08`) and is out of this implementation wave.

## Consequences
Benefits:
- Adds explicit identity and ownership boundaries without violating module architecture rules.
- Reduces data leakage risk by default through user-scoped repository queries and 404 masking.
- Keeps contracts clear for frontend routes and API usage.

Tradeoffs:
- Access-token-only session means frontend stores bearer token in localStorage in this wave.
- MCP user scoping increases startup requirements for MCP clients.
- Existing project/task data requires migration backfill for ownership.

Follow-up:
- Implement refresh-token/session rotation in dedicated `USR-08` flow.
- Reassess storage strategy for access credentials after refresh flow is introduced.

## Alternatives considered
- Cookie httpOnly session as initial phase:
  - Rejected for this wave due to larger immediate backend/frontend integration scope.
- Global technical user for MCP:
  - Rejected to avoid bypassing per-user tenancy goals.
- Returning `403` on cross-user access:
  - Rejected to avoid resource existence disclosure.
