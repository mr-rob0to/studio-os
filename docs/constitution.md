# Studio OS Constitution

## Core Principles

### 1. Development Workflow

All changes MUST land through short-lived feature branches and pull requests into `main`, which MUST remain releasable.

- Each numbered delivery-plan task MUST use a fresh session, isolated worktree, branch, and pull request.
- Branches MUST start from and be rebased on a freshly fetched `origin/main`.
- Commits MUST use Conventional Commits and remain atomic and independently testable.
- A task MUST update the repository plan state and stop before the next task begins.

Rationale: Small, isolated changes keep review scope clear and preserve a useful delivery history.

### 2. Code Quality and Standards

Code MUST prioritize correctness, readability, and strict type safety.

- TypeScript MUST remain in strict mode; weak-type escape hatches require written justification.
- ESLint MUST pass locally and in GitHub Actions.
- Names MUST convey intent, modules MUST have one clear responsibility, and circular dependencies MUST NOT exist.
- Components MUST remain small and separate presentation from data access and server state.
- Shared visual values MUST use CSS custom properties rather than repeated literals in components.
- Server-only modules and secrets MUST never enter client bundles.

Rationale: Clear boundaries and automated checks keep the code understandable as the workflow grows.

### 3. Testing and Quality Assurance

Tests MUST focus on behavior that would cause product or data-integrity harm if it regressed.

- Vitest and React Testing Library MUST cover business rules and rendered user-visible behavior.
- Validation boundaries, analysis parsing, retry claims, and persistence ordering MUST be developed test-first.
- A new regression guard MUST be seen to fail by breaking the behavior it watches, then restoring it.
- Tests MUST be deterministic and isolated; database tests MUST use a fresh in-memory PGlite instance.
- Loading, empty, failure, pending, and populated states MUST be tested where a screen exposes them.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` MUST pass before review.

Rationale: Risk-based tests provide useful protection without turning low-risk scaffolding into ceremony.

### 4. Architecture and Design

Architecture MUST preserve the approved separation between routes, components, contracts, services, providers, and persistence.

- Server Components MUST read through services directly; they MUST NOT call the application's own Route Handlers.
- Route Handlers MUST map validated HTTP input to services and contain no business rules.
- Zod schemas MUST define serializable application boundaries.
- Services MUST depend on narrow interfaces rather than database or provider implementations.
- Drizzle PostgreSQL schema and committed migrations MUST serve both PGlite and Neon.
- Fixtures and mocks MUST match the real contracts; the contract wins when they disagree.
- Material architecture changes MUST update `docs/ARCHITECTURE.md` in the same pull request once that document is introduced by the delivery plan.

Rationale: Explicit boundaries make the system explainable and allow local and production adapters to change independently.

### 5. API Compatibility and Versioning

HTTP behavior and shared schemas are contracts and MUST NOT change silently.

- Mutation endpoints MUST return the documented success payloads or the shared error envelope.
- Existing response fields MUST NOT be removed, renamed, or change type without a flagged migration plan.
- New request fields MUST be optional or have a documented default when compatibility requires it.
- Retry behavior MUST be safe under repeated or concurrent requests.
- Contract changes MUST update schemas, handlers, tests, and documentation together.

Rationale: Explicit compatibility rules prevent the interface and user experience from drifting apart.

### 6. Performance and Scalability

Request work MUST be bounded and suitable for Vercel's serverless runtime.

- Database access MUST avoid N+1 query patterns and include indexes for introduced query patterns.
- Outbound calls MUST have explicit timeout and retry budgets.
- Long-running work MUST NOT be added to request handlers without an approved architecture change.
- Server Components MUST keep server state out of ad hoc client stores.
- Assets and client JavaScript MUST stay minimal; performance budgets will be established when product screens exist.

Rationale: Bounded server work and minimal client code keep the application responsive and deployable.

### 7. Security and Data Handling

All external input and provider output MUST be treated as untrusted.

- Route Handlers MUST validate media type, payload size, path parameters, and Zod schemas before side effects.
- Provider output MUST cross the adapter boundary as `unknown` and be parsed centrally before persistence or rendering.
- Secrets MUST come from server environment variables, never use `NEXT_PUBLIC_`, and never be committed.
- Raw database or provider failures, credentials, and unnecessary brief content MUST NOT be logged or returned.
- Untrusted rendered content MUST rely on React escaping unless a reviewed sanitizer is required.
- Dependencies with known Critical or High vulnerabilities MUST NOT ship.

Rationale: Validation and server-only secrets reduce the highest-risk paths in the planned workflow.

### 8. Error Handling and Observability

Failures MUST be safe, visible, and actionable.

- Expected failures MUST map to specific safe codes and plain-language messages.
- HTTP errors MUST use the shared envelope and MUST NOT expose stack traces or raw provider responses.
- Request logs MUST carry a request ID and use appropriate severity.
- Analysis failure MUST preserve the brief and a retryable stored state.
- The readiness endpoint MUST reflect real database health without invoking the model provider.

Rationale: Clear failure states help users recover and give operators enough information without leaking internals.

### 9. Delivery and Deployment

Delivery MUST be reproducible through pnpm, GitHub Actions, and Vercel.

- The lockfile MUST be committed and CI MUST use `pnpm install --frozen-lockfile`.
- CI MUST run lint, typecheck, tests, and a production build.
- Builds MUST NOT open database connections or invoke a model provider.
- Preview and production MUST use Neon; local development and tests MUST use PGlite.
- Environment-specific configuration MUST remain external to source control.
- Committed migrations, not schema push, MUST govern shared databases once persistence is introduced.

Rationale: Reproducible checks and environment boundaries make promotion predictable.

### 10. Documentation

Documentation is part of each task's definition of done.

- The README MUST take a new contributor from clone to a running local application.
- The repository plan MUST remain the live record of done, next, and blocked work.
- Architecture and learning notes MUST change with the behavior they describe once introduced.
- Documentation MUST state deliberate tradeoffs, exclusions, verification evidence, and safe extension paths.
- Accessibility targets and supported browsers MUST be documented when product screens are introduced.

Rationale: Durable repository guidance prevents the conversation from becoming hidden project state.

### 11. Code Review

Every non-docs pull request MUST receive one fresh independent read-only Terra review after implementation is complete.

- The reviewer receives only the repository state, `origin/main` base, diff, acceptance criteria, and review checklist.
- The review MUST cover correctness, regressions, security, concurrency, compatibility, and missing tests.
- Critical and Important findings MUST be verified and resolved; Minor findings MUST be logged.
- The implementing agent MUST inspect the final diff and run the changed application path before opening the pull request.

Rationale: One independent final review catches defects without multiplying review cycles.

## Quality Gates

Work is done only when:

- The active task acceptance criteria are met without beginning the next task.
- Relevant lint, typecheck, tests, build, and runtime paths pass.
- The final diff contains only approved task files and necessary plan state.
- The independent review is complete and required findings are resolved.
- The branch is rebased on fresh `origin/main`, clean, pushed, and open as a review-ready pull request.
- The task checkbox and three-line repository plan status are current.

## Governance

This constitution is authoritative for Studio OS planning and implementation.

- Amendments MUST include a documented rationale and update dependent guidance in the same pull request.
- Version changes use Semantic Versioning: MAJOR for removed or redefined principles, MINOR for new or materially expanded principles, PATCH for clarifications.
- Compliance MUST be checked during planning and before a task is declared complete.
- The active repository `AGENTS.md` remains authoritative for workflow and reviewer instructions when it is stricter.

**Version**: 1.0.0 | **Ratified**: 2026-08-22 | **Last Amended**: 2026-08-22
