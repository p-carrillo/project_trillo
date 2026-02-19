# Frontend Standard

## Scope
Frontends live in `/apps/<app-name>` and are treated as independent deployable units when needed.

## Principles
- Keep UI state predictable and component boundaries clear.
- Separate presentation from data-fetching/application logic.
- Consume backend APIs/contracts through typed clients and shared contracts where applicable.

## Architecture
- Prefer feature-oriented structure over technical dumping grounds.
- Define clear app-level routes, layouts, and shared UI primitives.
- Keep domain logic out of UI components when possible.

## Quality
- Accessibility is mandatory (semantic HTML, keyboard support, labels).
- Destructive actions must use a shared in-app confirmation dialog pattern; avoid browser-native `window.confirm`.
- SEO requirements must follow `.ai/standars/seo.md`.
- Performance budgets and monitoring follow `.ai/standars/performance.md`.

## Docker-first
- Frontend dev/prod flows must run in Docker.
- Avoid host-specific assumptions (paths, binaries, OS behavior).

## Cross-standard alignment
- Frontend integration targets backend services composed via `/modules/platform`.
- Frontend tasks must follow `pnpm` + `turbo` script conventions.
