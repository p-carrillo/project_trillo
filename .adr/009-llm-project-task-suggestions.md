# LLM-Based Project Task Suggestions (Preview + Apply)

## Date
2026-02-20

## Status
Accepted

## Context
The product requires a Robo Mode v1 capability to bootstrap project work from project descriptions.

Required behavior for this iteration:
- Generate initial task suggestions from project description and current board context.
- Keep users in control with a preview step before persisting tasks.
- Preserve existing hexagonal boundaries and Docker-first runtime assumptions.
- Avoid introducing unnecessary SDK lock-in for provider integration.

This introduces a runtime-critical external dependency boundary (LLM provider) and a new API workflow.

## Decision
- Add two project-scoped endpoints:
  - `POST /api/v1/projects/{projectId}/task-suggestions/preview`
  - `POST /api/v1/projects/{projectId}/task-suggestions/apply`
- Implement a new domain port in `modules/tasks/domain` for task suggestion generation.
- Implement a dedicated application use-case service in `modules/tasks/application` that:
  - validates project ownership and description presence,
  - provides existing board context to the generator,
  - validates suggestion integrity and limits,
  - applies suggestions by creating epics first and then linked tasks.
- Implement an OpenAI-compatible infrastructure adapter using built-in `fetch` (Node.js runtime), configured via environment:
  - `LLM_API_BASE_URL`
  - `LLM_API_KEY`
  - `LLM_API_MODEL`
  - `LLM_API_TIMEOUT_MS`
- Use a preview-then-apply contract (two-step workflow) instead of direct write in one call.

## Consequences
Benefits:
- User control over generated output before data mutation.
- Clear separation of business rules (application/domain) from provider details (infrastructure).
- Low lock-in risk by using OpenAI-compatible HTTP API instead of provider SDK.
- API contract stays explicit and testable with deterministic endpoint semantics.

Tradeoffs:
- Two-step flow adds one extra client-server roundtrip.
- LLM availability and quality are external risk factors.
- Runtime configuration now requires additional environment variables.

Follow-up:
- Evaluate per-item edit/select in preview phase if product needs finer control.
- Consider idempotency keys if repeated apply calls become operationally relevant.
- Reassess model/provider defaults based on quality/cost telemetry.

## Alternatives considered
- Single-step generate-and-create endpoint:
  - Rejected because it removes user confirmation and increases accidental board pollution risk.
- Provider SDK integration:
  - Rejected for v1 to avoid unnecessary dependency lock-in and to keep integration surface minimal.
- Frontend-only suggestion generation:
  - Rejected because API keys and provider orchestration must remain server-side.
