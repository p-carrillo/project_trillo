# USR-03 - Identity Backend And JWT

## Objective
Implement register/login and authenticated user retrieval in the backend.

## Deliverable Unit
Identity backend module working with JWT and user persistence.

## Scope
- Create `modules/users` (domain, application, infrastructure, interfaces, test) following Hexagonal Architecture.
- Minimum `User` model:
  - `id`, `username`, `email`, `displayName`, `passwordHash`, `createdAt`, `updatedAt`.
- Domain repository + MariaDB implementation in infrastructure.
- Use cases:
  - register user
  - authenticate with username/password
  - get authenticated user (`me`)
- Secure password hashing (defined in ADR).
- JWT issuance on login/register.
- Wiring in `modules/platform` without moving business logic into the composition root.

## Out Of Scope
- Per-user tasks/projects isolation (USR-04).
- Frontend pages.

## Acceptance Criteria
1. A migration exists for the `users` table with unique indexes on `username` and `email`.
2. There are no SQL queries outside repositories.
3. HTTP handlers only validate input, call use cases, and map errors.
4. JWT includes at least `sub` and `username`.
5. `GET /api/v1/auth/me` returns the authenticated user with a valid token.

## Minimum Tests
- Domain/application unit tests in `modules/users/test`.
- MariaDB repository integration tests for `users`.
- Auth contract/API tests in `modules/platform/test`.

## Dependencies
- Requires `USR-02`.
