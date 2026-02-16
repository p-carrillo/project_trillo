# Security Standard

## Principles
- Secure by default.
- Least privilege.
- Defense in depth.

## Application security
- Validate and sanitize untrusted input.
- Use parameterized queries via repository/infrastructure layers.
- Apply authentication/authorization consistently at boundaries.
- Do not leak internal errors or sensitive data.

## Secrets and credentials
- Never store secrets in repository or container images.
- Rotate secrets using platform tooling.

## Supply chain
- Keep dependencies updated and audited.
- Pin base images and critical dependency versions.
- Use trusted sources for runtime images and packages.

## Container security
- Prefer non-root users in runtime images.
- Minimize image attack surface.
- Keep images immutable.

## Cross-standard alignment
- Security-sensitive backend assembly is controlled in `/modules/platform`.
- Security controls must apply consistently in Docker-first environments.
- Security checks should be runnable in monorepo workflows via `pnpm` + `turbo`.
