# Trillo Task Manager Monorepo

Task manager fullstack con arquitectura hexagonal en backend, contratos compartidos y ejecución Docker-first.

## Estructura relevante
- `apps/web`: frontend React + Vite con UI kanban inspirada en `.ai/designs`.
- `modules/tasks`: dominio y casos de uso de tareas, repositorio MariaDB e interfaz HTTP.
- `modules/platform`: composition root único del backend (Fastify, config, wiring).
- `packages/contracts`: OpenAPI y tipos compartidos (`trillo.v1.yaml`, `types.ts`).
- `docker/compose.dev.yml`: stack local (MariaDB + backend + frontend).

## API principal
- `GET /api/v1/projects`
- `POST /api/v1/projects`
- `DELETE /api/v1/projects/:projectId`
- `GET /api/v1/tasks?boardId=<id>`
- `POST /api/v1/tasks`
- `PATCH /api/v1/tasks/:taskId/status`
- `GET /health/live`
- `GET /health/ready`

## MCP (`stdio`) para clientes LLM
El backend expone un runtime MCP separado del HTTP server usando `modules/platform/mcp-main.ts`.

Configuración requerida:
- `MCP_API_KEY` en entorno.
- `--api-key=<valor>` al iniciar el proceso.
- Si falta o no coincide, el proceso falla en startup.

Tools disponibles (paridad API v1):
- `list_projects`
- `create_project`
- `update_project`
- `delete_project`
- `list_tasks`
- `create_task`
- `update_task`
- `move_task_status`
- `delete_task`

Ejecutar en local:
```bash
cd modules
MCP_API_KEY=change-me pnpm mcp:dev
```

Ejecutar binario compilado:
```bash
cd modules
MCP_API_KEY=change-me pnpm mcp:start
```

Nota Docker-first:
- Dentro del contenedor backend, usar:
```bash
node modules/dist/platform/mcp-main.js --api-key=$MCP_API_KEY
```

## Ejecutar con Docker
```bash
docker compose -f docker/compose.dev.yml up --build
```

Servicios:
- Frontend: `http://localhost:8080`
- Backend: `http://localhost:3000`
- MariaDB: `localhost:3306`

## Desarrollo frontend con hot reload (watch)
Para cambios inmediatos en UI (Vite + HMR dentro de Docker):

```bash
docker compose -f docker/compose.dev.yml up -d mariadb backend web-dev
```

Frontend dev:
- `http://localhost:5173`

Notas:
- `web-dev` usa bind mount del repo y levanta `pnpm dev`.
- `/api/*` se proxea a `backend` automáticamente desde Vite.
- Si ya tienes `web` (nginx en `:8080`) corriendo, puedes mantenerlo o pararlo:

```bash
docker compose -f docker/compose.dev.yml stop web
```

## Calidad y checks
Scripts estándar por workspace: `dev`, `build`, `test`, `lint`, `typecheck`.

Pipeline monorepo:
```bash
corepack pnpm turbo run lint test typecheck build
```
Este comando es obligatorio antes de cerrar cualquier cambio.

## CI/CD (GitHub Actions)
El repositorio ejecuta un workflow de CI/CD en `/.github/workflows/ci-cd.yml`.

Flujo:
- `quality-gate`: corre `pnpm turbo run lint test typecheck build` para PRs, pushes y ejecuciones manuales.
- `deploy`: corre solo tras pasar quality gate en push a `main` (o `workflow_dispatch`) y despliega por SSH con Docker Compose.

Secrets requeridos para deploy:
- `DEPLOY_SSH_KEY`
- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_PATH`

Despliegue remoto:
- Sincroniza código por `rsync` al host.
- Levanta servicios con `docker compose -f docker/compose.dev.yml up -d --build`.
- Verifica salud en:
  - `http://localhost:3000/health/ready`
  - `http://localhost:8080/health/live`

## Troubleshooting rápido
- Si aparece `Unexpected API error` al usar endpoints nuevos, confirma que el backend no está desactualizado y reconstruye:

```bash
docker compose -f docker/compose.dev.yml up -d --build backend
```

- Luego valida salud del backend:

```bash
docker compose -f docker/compose.dev.yml exec -T backend node -e "fetch('http://127.0.0.1:3000/health/ready').then(r=>console.log(r.status)).catch(()=>process.exit(1))"
```
