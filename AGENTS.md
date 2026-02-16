# Agent Governance

## Purpose
This file defines mandatory behavior for agents working in this repository.

## Roles

### architect
- Owns architecture integrity, module boundaries, and long-term maintainability.
- Approves structural changes and validates compliance with Hexagonal Architecture.
- Ensures ADRs exist for architectural and significant dependency decisions.

### backend developer
- Implements backend features inside module boundaries and layer rules.
- Keeps controllers/adapters thin and puts business logic in application/domain.
- Ensures platform module remains composition-only.

### frontend developer
- Implements frontend applications in `/apps` respecting API contracts.
- Maintains accessibility, SEO, performance, and consistent UI architecture.
- Preserves Docker-first assumptions for development and production builds.

### reviewer
- Validates compliance with all standards before merge.
- Rejects changes that break architecture boundaries or missing ADR requirements.
- Confirms tests and quality gates are complete.

## Mandatory rules
- Follow all `.ai/standars` documents.
- Do not violate Hexagonal Architecture rules.
- Every relevant architectural decision must be recorded in an ADR.
- No significant dependency introduction without ADR.
- Always write tests.
- Keep code quality high: maintainability, clarity, and consistency.
- Never place DB queries outside repositories.
- Repository interfaces must live in the Domain layer; implementations live in Infrastructure.
- Cross-module imports are forbidden unless through `/packages/contracts` (or explicit public API boundary documented in standards/ADR).
- Docker-first: any runtime assumption must be valid inside Docker containers.
- Backend composition root is mandatory: `/modules/platform` must exist and is the only backend entrypoint.

## When to create ADRs
Create or update an ADR when:
- Introducing or replacing key frameworks/runtimes/build systems.
- Changing module boundaries, architecture style, or dependency rules.
- Adding significant dependencies (security, operational, or long-term impact).
- Changing database strategy, API style/versioning strategy, or deployment model.
- Approving exceptions to existing standards.

## How to propose changes
1. Update relevant standards and/or `AGENTS.md` first.
2. Create or update ADRs documenting context, decision, and tradeoffs.
3. Only then implement code aligned with updated docs.
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
- Was an ADR added/updated for architectural or significant dependency changes?
- Are logs/errors/observability aligned with standards?
