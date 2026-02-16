# Fullstack TypeScript Monorepo Template (Docker-First)

## What this template is
This repository is a production-oriented monorepo template for fullstack TypeScript systems, designed for agent-assisted development.

It provides:
- A strict documentation-driven workflow before product code.
- Hexagonal backend module boundaries with a mandatory `platform` composition root.
- Docker-first local and production-aligned runtime expectations.
- Monorepo build orchestration with `pnpm workspaces` + `Turborepo`.
- ADR-driven decision tracking for architecture and major dependency choices.

## Problems this template solves
- Prevents architecture drift with explicit standards and ADR governance.
- Reduces "works on my machine" issues with Docker-first assumptions.
- Scales teams and modules safely with strict dependency boundaries.
- Improves delivery reliability via consistent build, test, and CI conventions.
- Makes agent output more predictable by defining authoritative guidance in `.ai/`.

## Quickstart
1. Clone and enter the project:
```bash
git clone <your-template-repo-url> <new-project-name>
cd <new-project-name>
```
2. Ensure toolchain is available (Node.js 22 LTS and pnpm):
```bash
corepack enable
node -v
pnpm -v
```
3. Install dependencies:
```bash
pnpm install
```
4. Run standard checks:
```bash
pnpm turbo run lint test typecheck build
```

## Docker Quickstart
Use Docker as the default execution environment for local development.

High-level commands:
```bash
# Start local stack (database + backend + frontend + optional reverse proxy)
docker compose -f docker/compose.dev.yml up --build

# Stop local stack
docker compose -f docker/compose.dev.yml down
```

Expected behavior:
- Backend container starts from `modules/platform`.
- Services expose health endpoints.
- Logs are emitted to stdout/stderr.

## Build System Quickstart (Turborepo)
Use Turborepo for all monorepo tasks.

Examples:
```bash
# Run one task across all relevant workspaces
pnpm turbo run test

# Run full verification pipeline
pnpm turbo run lint test typecheck build

# Scope to one package/app/module
pnpm turbo run build --filter=@apps/web
```

Conventions:
- Every workspace uses the same script names: `dev`, `build`, `test`, `lint`, `typecheck`.
- Task dependencies and cache behavior are defined in `turbo.json`.

## Bootstrap Prompt
Use this prompt when starting a new project from this template:

```text
You are bootstrapping a new project from a TypeScript monorepo template.

Goals:
1) Understand this project's domain, business constraints, operational constraints, and quality requirements.
2) Update `/AGENTS.md` so roles, module boundaries, and constraints are project-specific.
3) Review and update `.ai/standars/*` files where needed, with priority on:
   - `.ai/standars/architecture.md`
   - `.ai/standars/repo-structure.md`
   - `.ai/standars/api.md`
   - `.ai/standars/packages.md`
   - `.ai/standars/docker.md`
   - `.ai/standars/build.md`
4) Rename and adjust modules list and boundaries to match the project domain.
5) Create initial ADRs in `.adr/` for major architectural and technology decisions.
6) Consolidate all documentation so it is project-specific, actionable, and no longer template-generic.

Process constraints:
- Do not generate product/application code until documentation and ADRs are aligned and approved.
- If a major dependency or architectural choice changes, document it first and create/update ADRs.
- Keep Docker-first assumptions for local and production runtime.

Deliverables for this bootstrap phase:
- Updated `/AGENTS.md`
- Updated `.ai/standars/*.md` files
- Initial ADR set in `.adr/`
- A short summary of decisions and unresolved questions
```
