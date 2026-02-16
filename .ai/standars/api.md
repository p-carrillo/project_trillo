# API Standard

## Principles
- APIs are contract-first and explicit.
- External behavior must be stable, versioned, and documented.
- Error semantics must be consistent across endpoints.

## Design guidelines
- Use clear resource/use-case oriented routes.
- Version APIs when introducing breaking changes.
- Validate request input at interface boundaries.
- Normalize success and error response structures.

## Contracts
- Shared API contracts should live in `/packages/contracts` where cross-module/app reuse is needed.
- Avoid direct coupling to internal module implementation types.

## Error mapping
- Domain/application errors map to transport-level responses consistently.
- Do not expose internal stack traces or driver-level details.

## Documentation
- Keep API docs in sync with implementation and contracts.
- Significant API style changes require ADR updates.

## Cross-standard alignment
- Backend API composition entrypoint is `/modules/platform`.
- API behavior and infrastructure dependencies must be valid in Docker runtime.
- API-related verification tasks must run through `pnpm` + `turbo`.
