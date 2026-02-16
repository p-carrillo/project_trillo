# Repository Structure Standard

## Canonical layout
```text
/apps
  /<app-name>

/modules
  /<module-name>
    /domain
    /application
    /infrastructure
    /interfaces
    /test

/modules/platform
  /domain
  /application
  /infrastructure
  /interfaces
  /test

/packages
  /shared
  /contracts

/docker
```

## Intentions
- `/apps`: frontend applications (one or many).
- `/modules`: backend modules in hexagonal layers.
- `/docker`: Docker Compose and infra configuration for local and production-like environments.
- `/packages/shared`: reusable cross-cutting code.
- `/packages/contracts`: shared contracts and stable integration boundaries.

## Dependency rules
- `module/domain` MUST NOT depend on `application`, `infrastructure`, or `interfaces`.
- `module/application` may depend on `module/domain` (same module), `packages/shared`, and `packages/contracts`.
- `module/infrastructure` may depend on `module/application`, `module/domain` (same module), and external libraries.
- `module/interfaces` may depend on `module/application` and `module/domain`.
- Cross-module imports are forbidden unless through `packages/contracts` or explicitly documented public APIs.
- Shortcut imports that bypass layers are forbidden.

### Platform module (mandatory)
A dedicated module named `platform` MUST exist:

`/modules/platform`

Responsibilities:
- Acts as the backend composition root.
- Wires all modules together.
- Creates and configures the HTTP server.
- Instantiates infrastructure implementations.
- Performs dependency injection.

Rules:
- It MUST NOT contain business logic.
- It is the ONLY module allowed to import infrastructure from other modules.
- All backend containers MUST start from this module.

## Adding a new module
1. Create `/modules/<module-name>` with all standard layers.
2. Define domain contracts first (`domain`).
3. Implement use-cases in `application`.
4. Implement adapters in `infrastructure` and `interfaces`.
5. Wire the module in `/modules/platform`.
6. Add/update tests and contracts.
7. Add ADR if boundaries, architecture, or dependencies change significantly.

## Adding a new app
1. Create `/apps/<app-name>` with standard scripts (`dev`, `build`, `test`, `lint`, `typecheck`).
2. Define integration contracts with backend via `packages/contracts` when shared types are needed.
3. Add Docker build/runtime support.
4. Register app tasks in Turborepo pipeline.
