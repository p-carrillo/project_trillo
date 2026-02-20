# USR-04 - Tenancy And Workspace Data Authorization

## Objective
Isolate projects/tasks per user so each account only sees its own MonoTask.

## Deliverable Unit
Tasks/projects backend protected by user identity and ownership.

## Scope
- Add data ownership:
  - `projects.owner_user_id` (FK to `users.id`).
  - Adjust unique constraints per user (for example, project name uniqueness by owner).
- Update repositories and use cases to operate with authenticated `userId`.
- Protect project/task endpoints with JWT guard.
- Access policy: resources from another user must not be accessible.
- Align MCP routes with the ADR decision (technical user or defined scope).

## Out Of Scope
- Login/register forms.
- Profile panel UI.

## Acceptance Criteria
1. All project/task operations use `userId` in application/repository layers.
2. There is no cross-user data leakage.
3. Protected endpoints return `401` without a token and a controlled error response.
4. Accessing another user's resources returns a safe response (defined in ADR).
5. Migrations are idempotent and runnable in Docker.

## Minimum Tests
- `tasks` service unit tests covering ownership.
- Repository integration tests with two users and data isolation.
- Contract tests in `modules/platform/test` for 401/403/404 according to the defined mapping.

## Dependencies
- Requires `USR-03`.
