# Agent Governance

## Purpose
This file defines mandatory behavior for agents working in this repository.

## Mandatory first rule
- Following all `.ai/standars` documents is mandatory in every change.

## Mandatory rules

### Common
- Do not violate Hexagonal Architecture rules.
- Every relevant architectural decision must be recorded in an ADR.
- No significant dependency introduction without ADR.
- Always write tests.
- Before marking any code change as done, run the full quality gate: `pnpm turbo run lint test typecheck build` (inside Docker when using Docker-first workflow).
- If backend code under `/modules` changes, rebuild/restart backend containers before manual verification to avoid stale-runtime false negatives.
- Keep code quality high: maintainability, clarity, and consistency.
- Application language must be English for all user-facing UI copy and flows.
- Docker-first: any runtime assumption must be valid inside Docker containers.

### Backend
- Keep controllers/adapters thin and put business logic in application/domain.
- Never place DB queries outside repositories.
- Repository interfaces must live in the Domain layer; implementations live in Infrastructure.
- Cross-module imports are forbidden unless through `/packages/contracts` (or explicit public API boundary documented in standards/ADR).
- Backend composition root is mandatory: `/modules/platform` must exist and is the only backend entrypoint.
- Use these backend standards at minimum: `.ai/standars/backend.md`, `.ai/standars/architecture.md`, `.ai/standars/repo-structure.md`, `.ai/standars/api.md`, `.ai/standars/database.md`, `.ai/standars/errors.md`, `.ai/standars/observability.md`, `.ai/standars/test.md`, `.ai/standars/docker.md`.

### Frontend
- Implement frontend applications in `/apps` respecting API contracts.
- Maintain accessibility, SEO, performance, and consistent UI architecture.
- Preserve Docker-first assumptions for development and production builds.
- Use these frontend standards at minimum: `.ai/standars/frontend.md`, `.ai/standars/architecture.md`, `.ai/standars/repo-structure.md`, `.ai/standars/api.md`, `.ai/standars/seo.md`, `.ai/standars/performance.md`, `.ai/standars/test.md`, `.ai/standars/docker.md`.

## When to create ADRs
Create or update an ADR when:
- Introducing or replacing key frameworks/runtimes/build systems.
- Changing module boundaries, architecture style, or dependency rules.
- Adding significant dependencies (security, operational, or long-term impact).
- Changing database strategy, API style/versioning strategy, or deployment model.
- Approving exceptions to existing standards.

## How to propose changes
1. For regular feature/fix changes, do not modify `.ai/standars`; apply them as mandatory rules.
2. Create or update ADRs documenting context, decision, and tradeoffs when required.
3. Implement code aligned with existing standards and ADRs.
4. Validate with tests and quality checks.

## Reviewer checklist
- Are `.ai/standars` rules respected?
- Is Hexagonal layering preserved in each module?
- Does `/modules/platform` remain the only backend composition root?
- Are cross-module imports compliant (`/packages/contracts` or documented public API)?
- Are repository interfaces in domain and implementations in infrastructure?
- Are DB queries restricted to repositories?
- Are tests present and meaningful (unit/integration/contract/e2e as needed)?
- Are Docker assumptions valid and documented?
- Is user-facing application language English?
- Was an ADR added/updated for architectural or significant dependency changes?
- Are logs/errors/observability aligned with standards?
