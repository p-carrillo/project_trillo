# Projects in Tasks Module and Board Isolation Strategy

## Date
2026-02-18

## Status
Accepted

## Context
The application originally used a fixed board id (`project-alpha`) and static sidebar items in frontend. The product now requires:
- A project list in the left sidebar.
- Project creation.
- Switching between projects with isolated board data.
- Keeping task labels as free text (`category`) without introducing a dedicated labels catalog.

The backend already models board isolation through `tasks.board_id`, but there was no persistent `projects` entity or API.

## Decision
- Model projects inside `modules/tasks` instead of creating a new backend module.
- Add a new domain entity and repository for projects in the same module:
  - `Project` in `tasks/domain`.
  - `ProjectRepository` in `tasks/domain`.
- Add `ProjectService` in `tasks/application`.
- Add persistent `projects` table in MariaDB and enforce referential integrity from `tasks.board_id`:
  - `projects.id` is the technical board identifier.
  - `tasks.board_id` references `projects.id` with FK (`RESTRICT` on delete).
- Expose additive v1 API endpoints:
  - `GET /api/v1/projects`
  - `POST /api/v1/projects`
- Add project deletion through API:
  - `DELETE /api/v1/projects/:projectId`
  - Deletion removes all tasks/epics from that board in application flow before deleting the project record.
- Keep task APIs unchanged and continue using `boardId` as project identifier.
- Frontend uses project context to load board data and persists active project in localStorage.

## Consequences
Benefits:
- Real project persistence with DB-level integrity.
- No breaking change for existing task API consumers.
- Project switching isolates tasks, epics, and category labels naturally by `boardId`.
- Project deletion has deterministic cleanup semantics (board tasks are removed with the deleted project).
- Keeps implementation cohesive with current module boundaries and avoids premature module proliferation.

Tradeoffs:
- `tasks` module now owns both tasks and project context, increasing module responsibility.
- `boardId` naming remains for backward compatibility and may require future terminology cleanup.

Follow-up:
- Evaluate explicit rename from `boardId` to `projectId` in a future versioned contract.
- Reassess module split if project lifecycle grows significantly (rename, archive, permissions, billing).

## Alternatives considered
- New dedicated `projects` backend module:
  - Rejected for this iteration because current scope is tightly coupled to board context already owned by `tasks`.
  - Would add cross-module coordination overhead without clear immediate benefit.
- Frontend-only project storage:
  - Rejected because it does not provide shared persistence or backend-enforced isolation.
- Labels catalog as a separate entity:
  - Rejected by product decision for this iteration; `category` remains free text.
