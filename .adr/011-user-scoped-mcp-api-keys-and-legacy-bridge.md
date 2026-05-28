# User-Scoped MCP API Keys With Legacy Compatibility Bridge

## Date
2026-05-25

## Status
Accepted

## Context
The MCP runtime currently authenticates using a global startup API key plus a user JWT access token. This creates friction for MCP clients (two credentials) and makes credential lifecycle management coarse-grained.

The project now needs:
- Per-user MCP credentials that can be created and revoked independently.
- Better access control and auditability for MCP usage by user.
- A non-breaking migration path for existing MCP clients using the legacy startup mode.

Constraints from standards and governance:
- Keep Hexagonal Architecture boundaries.
- Keep `/modules/platform` as the only backend composition root.
- Keep Docker-first runtime assumptions.
- Keep existing HTTP/API behavior stable for current clients where possible.

## Decision
- Introduce user-scoped MCP API keys in `modules/users`:
  - Domain contracts for MCP API keys and repository abstraction.
  - Application service for create/list/revoke/authenticate key flows.
  - MariaDB-backed repository and schema migration (`mcp_api_keys` table).
- Store MCP keys hashed (scrypt) and never persist plaintext keys.
- Add authenticated HTTP management routes:
  - `GET /api/v1/users/me/mcp-api-keys`
  - `POST /api/v1/users/me/mcp-api-keys`
  - `DELETE /api/v1/users/me/mcp-api-keys/:keyId`
- Update MCP stdio runtime authentication with compatibility behavior:
  - Preferred mode: `--api-key=<USER_MCP_API_KEY>` without access token.
  - Legacy mode remains available when `--access-token` is supplied and `--api-key` matches `MCP_API_KEY` from environment.

## Consequences
Benefits:
- Simpler MCP client setup (single credential in preferred mode).
- Per-user credential lifecycle with revocation and usage tracking (`last_used_at`).
- Better ownership alignment with tenancy model and reduced blast radius versus a single global runtime key.
- Backward-compatible path for existing clients during migration.

Tradeoffs:
- Additional persistence and API surface area in `modules/users`.
- Operational responsibility for user key issuance/rotation practices.
- Legacy mode still exists temporarily and should be phased out later.

Follow-up:
- Define policy for key expiration defaults and maximum TTL.
- Add optional key scopes if tool-level least privilege is required.
- Evaluate eventual removal timeline for legacy startup mode.

## Alternatives considered
- Keep global API key + JWT only:
  - Rejected due to usability friction and coarse-grained access control.
- Replace with global API key only:
  - Rejected because it loses per-user authorization boundaries.
- Immediate hard cut to new mode:
  - Rejected to avoid breaking current clients; compatibility bridge chosen.
