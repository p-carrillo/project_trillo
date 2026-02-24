# Project and Column Ordering Strategy

## Date
2026-02-22

## Status
Accepted

## Context
The board currently supports drag and drop for tasks, but not for:
- Project ordering in the left sidebar.
- Column ordering in the board view.

Users need to reorder both without introducing architectural regressions:
- Backend remains hexagonal in `modules/tasks`, composed only via `modules/platform`.
- Shared API contracts stay in `packages/contracts`.
- Docker-first assumptions remain valid.

Two persistence scopes are required:
- Project ordering must persist across sessions and devices.
- Column ordering is a per-project visual preference and can remain local for this iteration.

## Decision
- Persist **project order** in backend with a new `projects.sort_order` field.
- Add a dedicated project reorder API endpoint:
  - `PATCH /api/v1/projects/reorder`
  - payload: `{ projectIds: string[] }`
  - response: canonical ordered `ListProjectsResponse`.
- Keep project order authority in backend by returning the ordered list after reorder.
- Persist **column order** in frontend per project using `localStorage`:
  - key prefix: `trillo.column-order.v1.<projectId>`
  - ids format: `status:<taskStatus>` and `custom:<columnId>`
  - sanitize stored order against current available columns.
- Reuse native HTML5 drag-and-drop events for both surfaces; no new DnD dependency is introduced.
- Keep task workflow semantics unchanged:
  - Column reorder is visual only.
  - Task status transitions remain backend-driven and unchanged.

## Consequences
Benefits:
- Projects have durable, cross-device ordering controlled by backend.
- Columns can be reordered immediately with no backend schema/API expansion for custom view preferences.
- No new dependency footprint for DnD.

Tradeoffs:
- Column order is not synchronized across devices in this iteration.
- Reorder validation introduces stricter API payload expectations (`projectIds` must match owned projects exactly).

Follow-up:
- Evaluate syncing column order in backend if multi-device consistency becomes a product requirement.
- Reassess MCP surface area for project reorder if agent workflows need parity with HTTP endpoints.

## Alternatives considered
- Frontend-only project ordering:
  - Rejected due to lack of cross-device persistence and server authority.
- Backend persistence for both project and column order:
  - Rejected for this iteration to keep column ordering a UI preference and avoid unnecessary API expansion.
- Introducing a drag-and-drop library:
  - Rejected because native HTML5 DnD already exists in app and this change does not require a new dependency.
