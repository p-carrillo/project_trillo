# Performance Standard

## Goals
- Predictable latency.
- Efficient resource usage.
- Measurable performance baselines.

## Backend
- Measure hot paths before optimizing.
- Use indexing and query optimization for DB-bound workloads.
- Avoid unnecessary synchronous/blocking operations.
- Define timeouts and retries for external calls.

## Frontend
- Track key UX metrics (e.g., LCP/CLS/INP where applicable).
- Reduce bundle size and avoid unnecessary client-side work.
- Prefer server-side or edge rendering where SEO/perf requires it.

## Operations
- Add performance checks to CI/CD where practical.
- Document major performance tradeoffs in ADRs.

## Cross-standard alignment
- Backend performance-critical composition remains centralized in `/modules/platform`.
- Performance validation must include Docker-first runtime conditions.
- Benchmark/build/test execution is orchestrated via `pnpm` + `turbo`.
