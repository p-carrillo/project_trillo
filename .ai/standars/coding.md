# Coding Standard

## General
- Use TypeScript in strict mode.
- Prefer clarity over cleverness.
- Keep functions small and focused.
- Avoid hidden side effects.

## Code organization
- Enforce Hexagonal layering in every backend module.
- Keep repository interfaces in `domain`; implementations in `infrastructure`.
- Never execute DB queries outside repository implementations.
- Keep module internals private; expose explicit public APIs only.

## Naming and API design
- Use domain language in names.
- Use explicit, intention-revealing function names.
- Avoid ambiguous abbreviations.

## Error handling
- Use typed/domain errors internally.
- Map errors consistently at module boundaries (HTTP/messages).
- Avoid leaking infrastructure error details to clients.

## Concurrency guidance
- Concurrency must be explicit and bounded.
- Prefer deterministic orchestration in application use-cases.
- Use `Promise.all` only when operations are independent and failure handling is defined.
- Guard shared resources with transactional or idempotent design.
- Document non-trivial concurrency behavior in module docs/tests.
- If introducing queues/workers/event-driven concurrency patterns, create/update an ADR first.

## Testing requirements
- Every change must include or update tests.
- Tests should verify behavior, not implementation details.

## Quality bar
- Maintainability, clarity, and consistency are mandatory.
- Refactor when complexity grows beyond acceptable limits.

## Cross-standard alignment
- Backend composition and runtime startup stay in `/modules/platform`.
- Development and runtime assumptions must remain Docker-first.
- Quality and verification tasks must integrate with `pnpm` + `turbo`.
