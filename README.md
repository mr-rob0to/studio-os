# Studio OS

Studio OS is an internal animation-studio brief application. A teammate submits creative direction, the application saves it, a configured analysis provider returns a structured readiness review, and the team sees either the completed analysis or a safe retry path.

The current interface includes:

- A brief board at `/briefs` with empty and populated states.
- A submission form at `/briefs/new` with client and server validation.
- A detail page at `/briefs/{id}` with completed, failed, and pending analysis states.
- A retry action that reuses the saved brief and analysis record.
- A database readiness endpoint at `/api/health`.

## Prerequisites

- Node.js 22
- pnpm 10.33.0
- Git

Enable the package manager bundled with Node.js:

```bash
corepack enable
```

## Local setup

These commands take a clean clone to a running application with file-backed PGlite and the deterministic mock analysis provider:

```bash
git clone https://github.com/mr-rob0to/studio-os.git
cd studio-os
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm db:migrate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The root route redirects to the brief board at `/briefs`.

The copied `.env.local` is already configured for local PGlite and successful mock analysis. It is ignored by Git. Local database files are written under `.pglite/`, which is also ignored. Do not commit either path.

Confirm the application and database are ready:

```bash
curl --fail --show-error http://localhost:3000/api/health
```

Expected response:

```json
{"status":"healthy","database":"ready"}
```

Stop the development server with `Ctrl+C`.

## Environment configuration

Application configuration fails closed when required values are missing or incompatible. Runtime modules read application-level settings only, not hosting-provider metadata.

### Database

| Environment | Required values | Database |
| --- | --- | --- |
| Local | `APP_ENV=local`, `DATABASE_DRIVER=pglite`, optional `PGLITE_DATA_DIR` | File-backed PGlite |
| Test | `APP_ENV=test`, `DATABASE_DRIVER=pglite`, no data directory | Fresh in-memory PGlite per database test |
| Preview | `APP_ENV=preview`, `DATABASE_DRIVER=neon`, `DATABASE_URL` | Neon HTTP |
| Production | `APP_ENV=production`, `DATABASE_DRIVER=neon`, `DATABASE_URL` | Neon HTTP |

PGlite is rejected for preview and production. Neon is rejected without a server-only `DATABASE_URL`. The empty `DATABASE_URL` placeholder in the copied local example is treated as unset, while an empty `PGLITE_DATA_DIR` remains invalid. Never prefix database or provider credentials with `NEXT_PUBLIC_`.

Local repository creation applies the committed migrations before returning a repository. Shared Neon databases are migrated explicitly with the same committed files:

```bash
APP_ENV=preview DATABASE_DRIVER=neon pnpm db:migrate
APP_ENV=production DATABASE_DRIVER=neon pnpm db:migrate
```

The one migration command loads the environment, validates `APP_ENV` and `DATABASE_DRIVER`, and dispatches to the selected adapter. Each Neon invocation requires `DATABASE_URL` in the server environment. The project uses committed migrations under `drizzle/`, not `drizzle-kit push`.

### Analysis provider

| Provider | Required values | Behavior |
| --- | --- | --- |
| Mock | `AI_PROVIDER=mock` | Deterministic local result, no credential |
| OpenAI | `AI_PROVIDER=openai`, `OPENAI_API_KEY` | Responses API with Structured Outputs |

`OPENAI_MODEL` defaults to `gpt-4o-mini`. `AI_TIMEOUT_MS` defaults to 12000 milliseconds and accepts a positive integer up to 60000. OpenAI mode never falls back to mock output.

The mock provider exposes explicit local verification modes:

- `MOCK_AI_MODE=success` returns a valid completed analysis.
- `MOCK_AI_MODE=malformed` returns invalid provider output, which becomes a stored failed analysis.
- `MOCK_AI_MODE=timeout` waits until the configured timeout, which becomes a stored timeout failure.

Restart `pnpm dev` after changing `.env.local`.

## User walkthrough

1. Open `/briefs` and select **New brief**.
2. Submit a title, content type, description, and target audience. Notes are optional.
3. The browser sends `POST /api/briefs`. The server validates the request and saves the brief with a pending analysis before calling the provider.
4. A successful request opens `/briefs/{id}`. Completed analysis shows a recommendation, themes, classification, audience interpretation, strengths, opportunities, risks, missing information, and assigned next actions.
5. A provider timeout, refusal, failure, or malformed response still opens the saved brief with a safe failed state.
6. **Retry analysis** sends `POST /api/briefs/{id}/analysis`. It never creates another brief or analysis row.
7. Return to `/briefs` to see saved briefs newest first.

For a code-level walkthrough, ownership map, and safe extension order, see [`docs/OWNERSHIP.md`](docs/OWNERSHIP.md).

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the local development server |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Check strict TypeScript without emitting files |
| `pnpm test` | Run the Vitest suite once |
| `pnpm test:watch` | Run Vitest in watch mode |
| `pnpm build` | Create the production build |
| `pnpm start` | Serve an existing production build |
| `pnpm db:migrate` | Validate the current environment and apply committed migrations through its selected PGlite or Neon adapter |

Pull request CI currently runs a frozen install, applies committed migrations to clean PGlite, then runs lint, typecheck, tests, and a production build. CI-owned production release and deployment are intentionally deferred to Task 9.

## HTTP interface

| Method and path | Purpose | Success |
| --- | --- | --- |
| `POST /api/briefs` | Validate, save, and analyze a new brief | `201` with the persisted brief and analysis |
| `POST /api/briefs/{id}/analysis` | Retry eligible failed or stale pending analysis | `200` with the updated persisted brief and analysis |
| `GET /api/health` | Check migrated database readiness without a provider call | `200` healthy or `503` degraded |

Mutation responses use `Cache-Control: no-store`, include an `X-Request-Id` header, and return safe errors in one envelope. The complete request, response, error, retry, and health contracts are in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#http-contracts).

## Accessibility and browser support

- Semantic headings, labels, field-level errors, live status messages, visible keyboard focus, and a skip link support navigation and recovery.
- Keyboard-only use is supported for navigation, form entry, validation recovery, submission, and retry.
- The layout changes from two desktop columns to one mobile column and respects `prefers-reduced-motion`.
- The supported baseline is the current and previous major versions of Chrome, Edge, Firefox, and Safari.

## Project documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): system composition, schema, flows, HTTP contracts, tradeoffs, exclusions, and change guides.
- [`docs/OWNERSHIP.md`](docs/OWNERSHIP.md): path ownership, contributor walkthrough, operational responsibilities, and implementation learnings.
- [`docs/constitution.md`](docs/constitution.md): binding engineering and delivery standards.
- [`docs/superpowers/plans/2026-08-22-studio-os.md`](docs/superpowers/plans/2026-08-22-studio-os.md): live delivery status and remaining roadmap.

## Current scope and roadmap

Included now: brief list, submission, detail, structured analysis, recoverable retry, PGlite and Neon composition, committed migrations, OpenAI and mock providers, database health, safe errors, accessible responsive UI, tests, build, and contributor documentation.

Explicitly excluded: authentication, authorization, editing, deletion, collaboration, uploads, queues, model routing, monitoring integrations, and new product workflows.

Next delivery steps:

1. Task 9 adds CI-owned migration and production deployment orchestration.
2. Task 10 verifies the live production workflow and records the final operational handoff.

## Verification and disclosure

Task 8 documentation was checked from an isolated clean copy using the setup and validation commands it documents. The recorded command evidence and known verification boundaries are in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#verified-baseline).

This repository was developed with AI-assisted planning, implementation, review, and documentation. The maintainer owns the architecture and delivery decisions, verified the documented behavior against the repository, ran the recorded checks, and remains responsible for the result.
