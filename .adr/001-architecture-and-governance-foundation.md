# Architecture and Governance Foundation for the Template

## Date
2026-02-16

## Status
Accepted

## Context
The template needed a consistent foundation before any product code was created. Without explicit boundaries and governance, a monorepo can quickly drift into unclear module ownership, coupling, and inconsistent agent behavior.

The team also needed a way to keep architecture decisions visible and auditable over time.

## Decision
We adopt the following baseline decisions for the template:
- Hexagonal Architecture is mandatory for backend modules.
- Backend modules follow explicit layers: `domain`, `application`, `infrastructure`, `interfaces`, `test`.
- A dedicated `modules/platform` module is mandatory and acts as the only backend composition root.
- `modules/platform` is the only backend entrypoint and the only module allowed to wire infrastructure across modules.
- Cross-module imports are forbidden unless done through `packages/contracts` or an explicitly documented public API boundary.
- Repository interfaces live in `domain`; repository implementations live in `infrastructure`.
- Database queries are forbidden outside repository implementations.
- Standards under `.ai/standars/` are mandatory.
- `/AGENTS.md` is authoritative for agent roles and workflow.
- Relevant architecture and significant dependency decisions require ADRs before implementation.

## Consequences
Benefits:
- Clear module boundaries and lower coupling.
- Better reviewability and safer parallel development.
- Predictable agent behavior and stronger documentation-first workflow.
- Decision traceability through ADRs.

Tradeoffs:
- Higher initial documentation and governance overhead.
- More process steps before code changes in architecture-sensitive areas.

Follow-up:
- Keep ADRs current as architecture evolves.
- Reject non-compliant changes during review.

## Alternatives considered
- Layered architecture without strict hexagonal boundaries:
  - Rejected due to higher risk of framework/DB leakage into core logic.
- Multiple backend composition roots:
  - Rejected due to startup ambiguity and inconsistent dependency wiring.
- Optional standards/agent rules:
  - Rejected because it weakens consistency in agent-assisted development.
