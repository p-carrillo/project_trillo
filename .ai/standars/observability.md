# Observability Standard

## Logging
- Log to stdout/stderr only.
- Use structured logs (JSON or clearly parseable format).
- Include correlation/request identifiers where applicable.
- Avoid logging secrets or sensitive personal data.

## Metrics and tracing
- Expose service health/readiness endpoints.
- Collect core service metrics (latency, error rate, throughput, resource usage).
- Adopt distributed tracing when multi-service complexity requires it.

## Docker alignment
- Containers must be observable without shelling into runtime containers.
- Logs/metrics endpoints must work consistently in local Docker and production.

## Cross-standard alignment
- Backend observability wiring is exposed through services composed in `/modules/platform`.
- Observability setup must preserve Docker-first parity across environments.
- Validation/quality tasks for observability conventions run through `pnpm` + `turbo`.
