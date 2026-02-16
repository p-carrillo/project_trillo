# SEO Standard

## Applicability
Applies to frontend apps that are publicly indexed or content-discoverable.

## Requirements
- Unique, descriptive page titles and meta descriptions.
- Canonical URLs where duplicate paths exist.
- Correct heading hierarchy and semantic structure.
- Robots and sitemap strategy documented per app.
- Structured data added where valuable and correct.

## Rendering strategy
- Choose rendering strategy (SSR/SSG/CSR hybrid) per app requirements.
- If runtime rendering is required, document container/runtime implications in Docker docs and ADRs.

## Performance linkage
- SEO-critical performance metrics must follow performance standards.

## Cross-standard alignment
- SEO-relevant backend delivery paths must still be composed through `/modules/platform`.
- Rendering/serving assumptions must stay Docker-first.
- SEO validation tasks should integrate with `pnpm` + `turbo` pipelines.
