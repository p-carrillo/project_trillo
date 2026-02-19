# USR-02 - API Contracts For Auth And User

## Objective
Define and version authentication/user contracts before implementing adapters.

## Deliverable Unit
OpenAPI contract and shared types updated in `packages/contracts`.

## Scope
- New endpoints:
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `GET /api/v1/auth/me`
  - `PATCH /api/v1/users/me/profile`
  - `PATCH /api/v1/users/me/password`
- Request/response schemas for authenticated user flows.
- Standardized errors (`invalid_credentials`, `username_taken`, `unauthorized`, etc.).
- Mark tasks/projects endpoints as protected by bearer token.

## Out Of Scope
- Register/login business logic.
- Form UI implementation.

## Acceptance Criteria
1. `packages/contracts/openapi/trillo.v1.yaml` includes auth/user endpoints and schemas.
2. `packages/contracts/src/types.ts` exposes types for the new endpoints.
3. Consistency with `ApiError` and `.ai/standars/api.md` is maintained.
4. Contracts support frontend username/password confirmation without backend coupling (confirmation fields remain outside the API contract).

## Minimum Tests
- Contract/API tests updated in `modules/platform/test`.
- Typecheck for `packages/contracts`.

## Dependencies
- Requires `USR-01`.
