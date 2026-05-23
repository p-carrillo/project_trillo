# Contexts and Project Membership Strategy

## Date
2026-05-06

## Status
Accepted

## Context
Projects were previously modeled as a single-level list per user and exposed directly in the sidebar.
Product now requires an additional organizational layer (`Context`) with these constraints:
- Context-aware project visibility in the sidebar.
- Context CRUD with the same tenancy rules as projects/tasks.
- A project can belong to multiple contexts.
- Existing API consumers must remain compatible with additive changes.

Repository standards also require:
- Hexagonal layering in `modules/tasks`.
- DB access only via repositories.
- `/modules/platform` as the single composition root.
- ADR-backed architectural changes.

## Decision
- Keep `Context` inside `modules/tasks` (no new backend module), alongside existing project/task logic.
- Introduce a many-to-many relation between projects and contexts:
  - `contexts` table.
  - `project_contexts` join table.
- Maintain project ownership on `projects.owner_user_id`; context ownership is enforced on `contexts.owner_user_id`.
- Extend project lifecycle in application layer:
  - `ProjectService.createProject` supports optional `contextIds`.
  - `ProjectService.updateProject` supports full context membership replacement.
  - Context membership must contain at least one context.
- Add context API endpoints (additive):
  - `GET /api/v1/contexts`
  - `POST /api/v1/contexts`
  - `PATCH /api/v1/contexts/:contextId`
- Extend projects API behavior (additive):
  - `GET /api/v1/projects` accepts optional `contextId` filter.
  - Project DTO includes `contextIds`.
- Keep project deletion global:
  - Deleting a project deletes all board tasks and the project record, regardless of its context memberships.
- Backfill strategy for existing data:
  - Create default `Personal` context per owner with projects.
  - Attach any project without memberships to that owner `Personal` context.

## Consequences
Benefits:
- Adds an explicit organizational layer without breaking existing project/task module boundaries.
- Preserves API v1 compatibility by using additive contract changes.
- Keeps tenancy guarantees intact for both contexts and projects.

Tradeoffs:
- `tasks` module now owns additional context lifecycle complexity.
- Reorder semantics remain project-global while UI project lists can be context-filtered.

Follow-up:
- Reassess reorder semantics per context if needed.
- Evaluate context deletion/archive flows in a dedicated iteration.
