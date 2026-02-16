# Error Handling Standard

## Principles
- Errors are explicit and typed where possible.
- Error behavior is deterministic and testable.
- Internal details are hidden at public interfaces.

## Layered error model
- Domain layer: domain-specific errors.
- Application layer: orchestration/validation/use-case errors.
- Infrastructure layer: adapter failures mapped to application/domain-friendly forms.
- Interface layer: map internal errors to transport-safe responses.

## API/transport mapping
- Maintain consistent status/error code mapping.
- Return machine-readable error codes and human-readable messages.
- Avoid leaking stack traces or vendor-specific diagnostics.

## Operational behavior
- Log errors with contextual metadata.
- Distinguish retryable vs non-retryable failures where relevant.

## Cross-standard alignment
- Error translation at backend boundaries is finalized through `/modules/platform` wiring.
- Error behavior must remain consistent in Docker-first execution contexts.
- Error-related checks and tests run via `pnpm` + `turbo`.
