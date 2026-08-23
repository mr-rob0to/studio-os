# Studio OS Ownership and Walkthrough

## Ownership model

Ownership here means responsibility for a boundary, not exclusive permission to edit a folder. A change owner must update the implementation, tests, contracts, and documentation that describe the behavior.

| Area | Primary paths | Owner responsibility |
| --- | --- | --- |
| Product flow and pages | `src/app/briefs/`, `src/components/`, `src/app/globals.css` | Accessible UI states, navigation, responsive behavior, and user-visible recovery |
| Shared contracts | `src/contracts.ts` | Serializable field rules, analysis shape, status values, and error envelope |
| HTTP interface | `src/app/api/`, `src/server/http/` | Request validation, status and error mapping, request IDs, body limits, and no-store responses |
| Brief workflow | `src/server/briefs/` | Save-before-provider ordering, retry eligibility, runtime composition, and direct read services |
| Analysis | `src/server/analysis/` | Prompt version, provider boundary, timeout, parsing, and safe failure mapping |
| Persistence | `src/server/db/`, `drizzle/`, `drizzle.config.ts` | Schema, migrations, adapter parity, atomic claims, ordering, and connection cleanup |
| Runtime configuration | `.env.example`, `src/server/config.ts`, analysis environment module | Explicit environments, server-only secrets, and fail-closed combinations |
| Verification | Co-located `*.test.ts` and `*.test.tsx`, `vitest.config.ts`, `.github/workflows/ci.yml` | Risk-based regression coverage and reproducible quality gates |
| Architecture and delivery state | `README.md`, `docs/`, `AGENTS.md` | Setup, decisions, tradeoffs, current state, extension steps, and scope boundaries |

No production release owner is implemented yet. Task 9 must assign that responsibility through the CI-owned release path before production deployment.

## Repository walkthrough

Read the code in this order to follow one complete brief from contract to screen.

### 1. Start with the contracts

Open `src/contracts.ts` first. It defines:

- Allowed brief input and content types.
- The structured analysis result.
- Persisted brief and analysis records.
- The client-safe submission subset.
- The shared API error envelope.

This is the application contract. Fixtures and provider output must conform to it.

### 2. Follow environment selection

Read `src/server/config.ts` and `src/server/analysis/environment.ts`.

- The database requires explicit application environment and driver values.
- Hosted environments cannot select PGlite.
- Neon cannot start without a database URL.
- The provider must be explicitly mock or OpenAI.
- Provider credentials stay server-only.

Then read `src/server/db/connection.ts` and `src/server/briefs/runtime.ts` to see how validated choices dynamically compose the repository and provider.

### 3. Follow persistence

Read `src/server/db/schema.ts`, `drizzle/0000_initial.sql`, and `src/server/db/repository.ts`.

- The schema has a brief row and at most one analysis row for each brief.
- Create saves the brief and pending analysis together.
- Final outcome writes are conditional on the active pending attempt.
- Retry is one conditional update that can be won by only one request.
- Reads map database rows back into contract-shaped application values.

Read `src/server/db/pglite.ts` and `src/server/db/neon.ts` last. They adapt the same repository to local or hosted PostgreSQL without changing service behavior.

### 4. Follow provider parsing

Read the analysis folder in this order:

1. `provider.ts` defines a provider that returns `unknown`.
2. `prompt.ts` separates stable instructions from delimited brief data and versions the prompt.
3. `mock.ts` provides deterministic success, malformed, and timeout behavior.
4. `openai.ts` calls the Responses API with Structured Outputs but still returns untrusted output.
5. `service.ts` owns timeout, local JSON and Zod parsing, and safe failure outcomes.

The provider adapter does not get to declare its content valid. The analysis service owns that decision for every provider.

### 5. Follow a create request

Read these files in sequence:

1. `src/components/brief-form.tsx`
2. `src/app/api/briefs/route.ts`
3. `src/server/http/briefs.ts`
4. `src/server/briefs/runtime.ts`
5. `src/server/briefs/service.ts`
6. `src/server/db/repository.ts`
7. `src/server/analysis/service.ts`

The form validates for fast feedback. The server repeats validation because browser input is untrusted. The workflow saves pending state, runs analysis, conditionally saves the outcome, and returns the persisted detail.

### 6. Follow a read

`src/app/briefs/page.tsx` and `src/app/briefs/[id]/page.tsx` are Server Components. They call `src/server/briefs/queries.ts` directly. The repository handle closes even when the read fails.

`src/components/brief-list.tsx` and `src/components/brief-analysis.tsx` render contract-shaped values. They have no database or provider access.

### 7. Follow retry

Start at `src/components/analysis-retry.tsx`, then read the retry Route Handler, HTTP mapper, workflow service, and repository claim.

The client prevents duplicate local clicks. The server provides the real guarantee through a conditional claim. Failed and stale pending work can be claimed. Fresh pending and completed work cannot.

### 8. Follow health

Read `src/app/api/health/route.ts`, `src/server/http/health.ts`, and `src/server/db/health.ts`.

The health path validates database configuration, creates the selected adapter, performs a real read against the migrated table, closes the adapter, and returns only healthy or degraded. It does not initialize analysis.

## Fifteen-minute reviewer tour

1. Run the local setup and open the empty brief board.
2. Submit a mock-success brief and inspect its detail analysis.
3. Point from the form to the create Route Handler and HTTP validation.
4. Show the repository's pending insert before the provider call in `BriefWorkflowService.create`.
5. Show `AnalysisProvider.generate` returning `unknown`, then the Zod parse in `analyzeBrief`.
6. Switch the mock to malformed or timeout, restart, submit a brief, and show the saved failed state.
7. Switch back to success, restart, retry that same brief, and show that its URL and brief row remain the same.
8. Show the conditional retry claim and conditional final save in the repository.
9. Call `/api/health` and show that it reads only the database path.
10. Finish with the environment matrix and the Task 9 production boundary.

## Operational responsibilities

### Local contributor

- Use `.env.local` copied from `.env.example`.
- Keep `.env.local`, credentials, `.pglite/`, build output, and logs untracked.
- Apply committed local migrations before starting.
- Use mock modes to verify completed and recoverable failure flows without external credentials.
- Run the frozen install and complete quality gate before review.

### Schema change owner

- Change the Drizzle schema and commit the matching migration together.
- Apply migrations to clean PGlite and run repository and migration tests.
- Keep migrations backward-compatible before production release work exists.
- Never replace committed migration history with schema push.
- Update the schema and field-change sections in `docs/ARCHITECTURE.md`.

### Provider change owner

- Keep credentials server-only and outputs typed as `unknown`.
- Preserve central timeout, parsing, failure mapping, and no-fallback behavior.
- Update prompt version when analysis meaning or shape changes.
- Test refusal, thrown, incomplete, timeout, and malformed behavior without logging raw output.

### HTTP change owner

- Validate before side effects.
- Preserve body limits, UTF-8 handling, safe error envelopes, request IDs, and no-store behavior.
- Keep Route Handlers free of business rules.
- Update endpoint tests and documented contracts in the same change.

### UI change owner

- Derive states from real contracts, not only fixtures.
- Keep server reads in Server Components and client boundaries limited to interaction.
- Test user-visible output, validation focus, duplicate prevention, recovery, keyboard use, and mobile layout.
- Update accessibility and browser guidance when support changes.

### Release owner, beginning in Task 9

- Own production environment variables and secrets outside source control.
- Ensure migrations complete before deployment when schema paths change.
- Keep releases serialized once migration begins.
- Prevent duplicate native and CI-owned production deployments.
- Record workflow, deployment, and smoke-test evidence without exposing secrets.

## Change ownership checklist

Before editing, identify every affected row:

| Change | Required co-owners |
| --- | --- |
| Brief field | Contract, schema and migration when stored, repository mapping, form, detail, prompt, tests, docs |
| Content type | Contract, form option, list and detail labels, tests, docs; no migration |
| Analysis field | Contract, prompt version, providers, rendering, stored-data compatibility, tests, docs |
| Provider | Environment validation, adapter, central analysis service compatibility, tests, docs |
| Endpoint | Shared contract, HTTP mapping, service, client behavior, tests, docs |
| Query | Repository, Server Component, loading or failure behavior, performance evidence, tests, docs |
| Database adapter | Configuration, composition, migrations, repository parity, close behavior, tests, docs |
| Production setting | CI or platform configuration, secret ownership, release ordering, rollback notes, verification evidence |

If a change adds a new product capability, external service, or more than 30 minutes of unplanned work, stop for a scope checkpoint before implementation.

## Implementation learnings

### Contracts need one enforcement owner

The database stores some status and category values as strings, providers return external data, and browser forms can be bypassed. Central Zod contracts give the application one readable enforcement point. This also makes the deliberate `content_type` text tradeoff safe inside the application boundary.

### Provider structure is not provider trust

Structured Outputs improve response shape, but transport success does not prove application validity. Returning `unknown` from every provider and parsing in one service prevents one adapter from weakening the boundary.

### Persistence order defines recovery

Saving the brief and pending analysis before provider execution means a provider failure does not erase user work. The failed record becomes an explicit recoverable state instead of an ambiguous missing request.

### Client duplicate prevention is not concurrency control

Refs and disabled buttons improve the experience in one browser. Only the database claim protects against two tabs, two processes, or repeated network requests. The final conditional save is equally important because old work can finish after a stale retry begins.

### Adapter parity needs one schema history

PGlite makes local and test setup inexpensive, while Neon fits preview and production. Sharing Drizzle schema and committed migrations is what makes them one persistence design rather than two unrelated databases.

### Server Components simplify reads

The board and detail page call query services directly. This removes an internal HTTP hop and keeps server state out of custom client stores. Route Handlers remain necessary for browser-initiated mutations and health.

### Health should test the dependency it names

The health endpoint queries the migrated `briefs` table. A process-only response could be healthy while configuration or schema is broken. The bounded real query gives the endpoint operational meaning without invoking the model provider.

### Safe errors require explicit operational follow-up

Generic browser errors protect credentials and brief content. Request IDs and structured console events provide a minimal correlation point. External monitoring is still excluded, so Task 9 and later operations work must decide how those events are collected before broader use.

## Deliberate boundaries for future owners

- Authentication must precede exposure beyond a trusted internal environment.
- Editing or deletion requires ownership, audit, and analysis invalidation decisions.
- Analysis history requires a new persistence model, not reuse of the one-row current-state design.
- Queues or background work require a new request and ownership model, not a longer timeout.
- Model routing or fallback requires explicit cost, privacy, and result-consistency rules.
- Monitoring integration must define redaction before exporting request or failure context.
- Deployment automation belongs to Task 9 and production evidence belongs to Task 10.

## AI assistance disclosure

AI tools assisted with planning, implementation, adversarial code review, and documentation. The maintainer made and owns the product, architecture, scope, verification, and release decisions. Contributors must verify generated suggestions against the contracts, repository behavior, and project quality gates before accepting them.
