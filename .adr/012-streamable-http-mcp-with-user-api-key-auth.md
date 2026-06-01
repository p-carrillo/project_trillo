# Streamable HTTP MCP Endpoint with User API Key Authentication

## Date
2026-06-01

## Status
Accepted

## Context
The current MCP integration is `stdio`-only. This works for local clients, but it does not allow direct remote MCP connections from agent platforms that require an HTTP endpoint.

The project now needs a production-safe MCP endpoint that can be consumed remotely with a single credential. Existing user-scoped MCP API keys already exist and provide per-user ownership and revocation.

Constraints:
- Preserve Hexagonal Architecture boundaries.
- Keep `/modules/platform` as backend composition root.
- Keep MCP tool behavior parity with current task/project use-cases.
- Keep Docker-first deployment assumptions.

## Decision
- Add a Streamable HTTP MCP endpoint at `POST|GET|DELETE /mcp` in the platform HTTP runtime.
- Authenticate each MCP request using a user MCP API key:
  - Primary header: `Authorization: Bearer <USER_MCP_API_KEY>`.
  - Compatibility header: `x-mcp-api-key: <USER_MCP_API_KEY>`.
- Maintain MCP session state in memory per backend instance by storing transport/runtime pairs keyed by `mcp-session-id`.
- Bind each MCP session to the authenticated user id and reject cross-user session reuse.
- Reuse the existing MCP tool server factory (`createPlatformMcpServer`) so tool behavior remains centralized.
- Expose `/mcp` through the production web reverse proxy (nginx) to make the endpoint reachable externally.

## Consequences
Benefits:
- Remote MCP clients can connect using only a user MCP API key.
- Authentication remains user-scoped, revocable, and auditable through existing key lifecycle APIs.
- Existing `stdio` flow remains available for local development.

Tradeoffs:
- Session state is in-memory per backend instance, so requests for a session must reach the same process.
- Horizontal scaling for MCP sessions may require shared/session-aware routing strategy in the future.

Follow-up:
- Evaluate session persistence or sticky routing for multi-instance production deployments.
- Document client configuration examples for popular MCP agent clients.

## Alternatives considered
- Keep `stdio` only:
  - Rejected because it cannot satisfy direct remote MCP connectivity requirements.
- Stateless HTTP MCP per request:
  - Rejected for now to avoid initialization lifecycle compatibility risks with existing clients.
- Global runtime API key for remote MCP:
  - Rejected because it weakens per-user ownership and revocation controls compared with user-scoped keys.
