# Trillo Task Manager Monorepo

Fullstack task manager with Hexagonal Architecture in the backend, shared contracts, and Docker-first execution.

## Relevant Structure
- `apps/web`: React + Vite frontend with a kanban UI inspired by `.ai/designs`.
- `modules/tasks`: task domain and use cases, MariaDB repository, and HTTP interface.
- `modules/platform`: single backend composition root (Fastify, config, wiring).
- `packages/contracts`: shared OpenAPI and types (`trillo.v1.yaml`, `types.ts`).
- `docker/compose.dev.yml`: local stack (MariaDB + backend + frontend).

## Main API
- `GET /api/v1/projects`
- `POST /api/v1/projects`
- `DELETE /api/v1/projects/:projectId`
- `POST /api/v1/projects/:projectId/task-suggestions/preview`
- `POST /api/v1/projects/:projectId/task-suggestions/apply`
- `GET /api/v1/tasks?boardId=<id>`
- `POST /api/v1/tasks`
- `PATCH /api/v1/tasks/:taskId/status`
- `GET /health/live`
- `GET /health/ready`

## MCP (`stdio`) For LLM Clients
The backend exposes an MCP runtime separate from the HTTP server through `modules/platform/mcp-main.ts`.

Required configuration:
- `MCP_API_KEY` in environment.
- `--api-key=<value>` when starting the process.
- If missing or mismatched, startup fails.

Available tools (API v1 parity):
- `list_projects`
- `create_project`
- `update_project`
- `delete_project`
- `list_tasks`
- `create_task`
- `update_task`
- `move_task_status`
- `delete_task`

Run locally:
```bash
cd modules
MCP_API_KEY=change-me pnpm mcp:dev
```

Run compiled binary:
```bash
cd modules
MCP_API_KEY=change-me pnpm mcp:start
```

Docker-first note:
- Inside the backend container, use:
```bash
node modules/dist/platform/mcp-main.js --api-key=$MCP_API_KEY
```

## Run With Docker
```bash
docker compose -f docker/compose.dev.yml up --build
```

Services:
- Frontend: `http://localhost:8080`
- Backend: `http://localhost:3000`
- MariaDB: `localhost:3306`

## Frontend Development With Hot Reload (Watch)
For immediate UI changes (Vite + HMR inside Docker):

```bash
docker compose -f docker/compose.dev.yml up -d mariadb backend web-dev
```

Frontend dev:
- `http://localhost:5173`

Notes:
- `web-dev` uses a repo bind mount and runs `pnpm dev`.
- `/api/*` is automatically proxied to `backend` from Vite.
- If `web` (nginx on `:8080`) is already running, you can keep it or stop it:

```bash
docker compose -f docker/compose.dev.yml stop web
```

## Quality And Checks
Standard workspace scripts: `dev`, `build`, `test`, `lint`, `typecheck`.

Monorepo pipeline:
```bash
corepack pnpm turbo run lint test typecheck build
```
This command is mandatory before closing any change.

## CI/CD (GitHub Actions)
The repository runs a CI/CD workflow in `/.github/workflows/ci-cd.yml`.

Flow:
- `quality-gate`: runs `pnpm turbo run lint test typecheck build` for PRs, pushes, and manual executions.
- `deploy`: runs only after the quality gate on pushes to `main` (or `workflow_dispatch`) and deploys via SSH with Docker Compose.

Required deploy secrets:
- `DEPLOY_SSH_KEY`
- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_PATH`

Remote deployment:
- Syncs code to the host via `rsync`.
- Starts services with `docker compose -f docker/compose.dev.yml up -d --build`.
- Verifies health at:
  - `http://localhost:3000/health/ready`
  - `http://localhost:8080/health/live`

## Quick Troubleshooting
- If `Unexpected API error` appears while using new endpoints, make sure the backend is not stale and rebuild:

```bash
docker compose -f docker/compose.dev.yml up -d --build backend
```

- Then validate backend health:

```bash
docker compose -f docker/compose.dev.yml exec -T backend node -e "fetch('http://127.0.0.1:3000/health/ready').then(r=>console.log(r.status)).catch(()=>process.exit(1))"
```
