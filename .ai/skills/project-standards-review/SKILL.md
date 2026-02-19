---
name: project-standards-review
description: Standards-driven code review for this repository. Use when asked to review staged, unstaged, or PR changes for compliance with `.ai/standars`, `AGENTS.md`, Hexagonal Architecture boundaries, Docker-first rules, test requirements, quality gates, and ADR obligations.
---

# Project Standards Review

## Execute review workflow

1. Inspect the review scope.
- Run `git status --short`.
- Read both `git diff --staged` and `git diff`.
- Include untracked files with `git ls-files --others --exclude-standard`.

2. Load only relevant standards.
- Always read `AGENTS.md`.
- Use `references/standards-checklist.md` to map changed paths to mandatory standards.
- Read only the standards needed for changed files to preserve context.

3. Validate introduced behavior only.
- Flag issues introduced by the current diff only.
- Ignore speculative impact; require a concrete scenario.
- Ignore cosmetic style nits unless they violate explicit standards.
- Flag missing tests when behavior changed and no meaningful tests were added.

4. Report actionable findings.
- Use one finding per discrete issue.
- Include priority, concise impact explanation, and file/line location.
- End with an overall verdict (`patch is correct` or `patch is incorrect`).
- If no findings exist, state that explicitly and list residual risks (if any).

## Enforce mandatory checks

- Preserve Hexagonal Architecture boundaries and inward dependency direction.
- Keep `/modules/platform` as the only backend composition root.
- Keep DB access in repositories only.
- Keep repository interfaces in `domain` and implementations in `infrastructure`.
- Keep cross-module imports behind `packages/contracts` or documented public API boundaries.
- Keep controllers/adapters thin and business logic in `application`/`domain`.
- Preserve Docker-first assumptions for runtime and verification.
- Ensure tests cover changed behavior.
- Require ADR when architecture boundaries or significant dependencies change.
- Require quality gate before closing work: `pnpm turbo run lint test typecheck build`.

## Calibrate severity

Use `references/severity.md`:
- `P0` for universal/blocking issues.
- `P1` for urgent issues for next cycle.
- `P2` for normal correctness/maintainability issues.
- `P3` for low-priority improvements.

## Resources

- `references/standards-checklist.md`
- `references/severity.md`
