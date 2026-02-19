# MCP Stdio Server for Task Manager Integration

## Date
2026-02-19

## Status
Accepted

## Context
The project needs to expose task-manager capabilities to LLM clients through MCP without changing the existing HTTP API surface.

This introduces a runtime-critical dependency (`@modelcontextprotocol/sdk`) and an additional backend entrypoint. The solution must preserve current architecture rules:
- `modules/platform` remains the backend composition root.
- Business logic stays in `modules/tasks/application` and `modules/tasks/domain`.
- Docker-first execution must stay valid.

Security requirements for this iteration mandate explicit API key validation for MCP access.

## Decision
- Introduce an MCP server runtime using `@modelcontextprotocol/sdk`.
- Implement MCP transport as `stdio` for v1.
- Run MCP as a dedicated process (`modules/platform/mcp-main.ts`) separate from the HTTP process.
- Expose task/project capabilities with parity to existing v1 API use-cases through MCP tools.
- Enforce startup authentication for MCP process:
  - `MCP_API_KEY` environment variable is mandatory.
  - CLI argument `--api-key` is mandatory.
  - Process startup fails if keys are missing or do not match.
- Keep tool input validation in interface adapters, then delegate to application services.

## Consequences
Benefits:
- MCP integration without breaking existing HTTP consumers.
- Clear separation of concerns: MCP as an additional input adapter.
- Local integration simplicity via stdio and deterministic process lifecycle.
- Explicit startup authentication with minimal runtime overhead.

Tradeoffs:
- Additional process to manage and observe in operations.
- New SDK dependency with long-term maintenance/security responsibility.
- `stdio` is optimized for local clients and not directly remote-friendly.

Follow-up:
- Evaluate HTTP streamable MCP transport if remote access becomes a requirement.
- Reassess whether per-tool authentication is needed in future security iterations.

## Alternatives considered
- HTTP streamable MCP in v1:
  - Rejected to avoid opening a new network surface and to reduce initial operational complexity.
- Running MCP in the same process as Fastify:
  - Rejected to keep lifecycle isolation and avoid coupling failure domains.
- No authentication for local MCP:
  - Rejected because security requirements mandate API key protection from v1.
