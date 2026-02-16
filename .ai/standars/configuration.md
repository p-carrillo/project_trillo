# Configuration Standard

## Principles
- Configuration is environment-driven.
- No hardcoded secrets.
- Validate configuration at startup.

## Rules
- Use environment variables for runtime configuration.
- Keep configuration schema explicit and typed.
- Fail fast on missing/invalid required values.
- Keep defaults safe and production-aware.

## Docker-first
- Configuration model must work in Docker Compose and production containers.
- Service endpoints/ports/credentials should be externally configurable.

## Security
- Never commit secrets.
- Use secret managers or deployment platform secret injection for production.

## Cross-standard alignment
- Backend configuration is resolved and applied from the `/modules/platform` composition root.
- Configuration checks and validation flows should be runnable via `pnpm` + `turbo`.
