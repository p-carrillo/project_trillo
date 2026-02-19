# USR-01 - Authentication And Tenancy ADR

## Objective
Close the required architecture decisions before implementing user functionality.

## Deliverable Unit
New (or updated) accepted ADR for:
- JWT-based authentication model.
- Per-user data isolation strategy (tenancy).
- User URL convention (`/u/:username`).

## Scope
- Define boundaries between `users`, `tasks`, and `platform` modules.
- Define password hashing strategy.
- Define cross-user resource access rules.
- Define impact on MCP and HTTP API.

## Out Of Scope
- Endpoint implementation.
- Frontend page implementation.

## Acceptance Criteria
1. An ADR exists in `.adr/` with context, decision, consequences, and alternatives.
2. The ADR defines whether `modules/users` is introduced and its public boundary.
3. The ADR defines the JWT flow (claims, expiration, secret, renewal if applicable).
4. The ADR defines how cross-user data access is prevented.
5. The ADR defines expected compatibility with the current MCP runtime.

## Minimum Tests
- No runtime tests in this unit (decision documentation only).

## Dependencies
- No prior dependencies.
