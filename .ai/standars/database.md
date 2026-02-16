# Database Standard

## Primary database
- Default relational database: MariaDB.
- Any database engine change requires an ADR.

## Access pattern
- All DB access goes through repositories.
- Repository interfaces belong to `domain`; implementations belong to `infrastructure`.
- No inline SQL/ORM calls in controllers, use-cases, or domain entities.

## Schema management
- Use explicit, versioned migrations.
- Migrations must be deterministic and idempotent where practical.
- Never mutate schema manually in production.

## Data integrity
- Enforce constraints (PK/FK/unique/check) at DB level.
- Model transactional boundaries explicitly in use-cases.
- Use indexes based on measured query patterns.

## Operations
- Backup/restore process must be documented.
- Local DB execution must be Dockerized.
- Connection settings come from environment variables (see configuration standard).

## Cross-standard alignment
- Backend services that use the database are composed and started from `/modules/platform`.
- Database workflows must remain Docker-first for local and production parity.
- Migration/test tasks must align with `pnpm` + `turbo` monorepo execution.
