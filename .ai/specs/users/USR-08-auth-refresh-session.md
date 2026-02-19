# USR-08 - Refresh Token Session Strategy

## Objective
Define and implement a secure refresh-token based session lifecycle after the access-token-only wave.

## Deliverable Unit
Dedicated auth session extension with refresh endpoint/contracts and frontend renewal flow.

## Scope
- Add refresh endpoint and contracts.
- Define refresh token transport/storage strategy.
- Rotation and revocation behavior.
- Frontend silent renewal behavior.
- Security and observability requirements for token refresh events.

## Out Of Scope
- Replacing existing users/auth business model.
- Changes unrelated to auth session lifecycle.

## Acceptance Criteria
1. Refresh endpoint and schemas are documented in `packages/contracts`.
2. Backend validates and rotates refresh tokens according to ADR decision.
3. Frontend renews access token without forcing login while session is valid.
4. Security events and controlled auth errors are observable.
5. Existing access-token-only flows remain backward compatible during rollout.

## Minimum Tests
- Contract/API tests for refresh success/failure/revocation.
- Backend unit/integration tests for rotation and expiry behavior.
- Frontend flow tests covering automatic renewal and fallback to login.

## Dependencies
- Requires `USR-07` closure.
