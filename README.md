# Studio OS

Studio OS is an internal animation-studio brief application. It provides a brief board and submission interface backed by shared contracts, PostgreSQL persistence, server-only structured analysis providers, and create and retry workflow endpoints.

## Prerequisites

- Node.js 22
- pnpm 10.33.0

Enable the package manager bundled with Node.js:

```bash
corepack enable
```

## Local setup

```bash
git clone https://github.com/mr-rob0to/studio-os.git
cd studio-os
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm db:migrate:local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The internal app sends the root route directly to the brief board at `/briefs`; the submission form is at `/briefs/new`.

## Database environments

- Set `APP_ENV=local|test|preview|production` and `DATABASE_DRIVER=pglite|neon` explicitly; missing or invalid values fail closed.
- Local development uses `APP_ENV=local`, `DATABASE_DRIVER=pglite`, and writes only to `PGLITE_DATA_DIR`.
- Tests create a fresh in-memory PGlite database and apply the same committed migration.
- Preview and production require `DATABASE_DRIVER=neon` plus a server-only `DATABASE_URL`; application configuration rejects PGlite before its adapter can load. Hosting configuration must map provider-specific deployment state to `APP_ENV` outside the application runtime.
- Put database credentials in an ignored `.env.local` locally or in sensitive deployment configuration, never in `NEXT_PUBLIC_` variables.
- Apply the same committed migration to Neon with `APP_ENV=preview pnpm db:migrate:neon` or `APP_ENV=production pnpm db:migrate:neon`. This command requires `DATABASE_URL`; it does not use `drizzle-kit push`.

## Analysis providers

- Set `AI_PROVIDER=mock` for deterministic local analysis without credentials, or `AI_PROVIDER=openai` for the OpenAI Responses API.
- OpenAI mode requires a server-only `OPENAI_API_KEY`; never expose it through a `NEXT_PUBLIC_` variable.
- `OPENAI_MODEL` defaults to `gpt-4o-mini`, and `AI_TIMEOUT_MS` defaults to 12000 when omitted.
- `MOCK_AI_MODE=success|timeout|malformed` provides explicit local failure verification. OpenAI failures never fall back to mock output.
- Provider output remains untrusted until the analysis service parses it with the shared Zod contract.

## Mutation endpoints

- `POST /api/briefs` requires `application/json`, enforces a 16 KiB body limit, validates the brief, persists the brief and pending analysis, then runs the configured provider.
- `POST /api/briefs/{id}/analysis` requires a valid brief UUID and an empty body. It retries a failed analysis, rejects active concurrent work, and reclaims pending work older than `AI_TIMEOUT_MS + 5 seconds`.
- Provider timeout, refusal, failure, and malformed output remain stored as safe failed analysis records so the brief is never lost.
- Errors use one JSON envelope with a request ID. Database failures, provider responses, credentials, and submitted brief content are never returned.

## Health endpoint

- `GET /api/health` queries the configured database and returns `200 {"status":"healthy","database":"ready"}` only when the migrated briefs table is ready.
- Database configuration, connection, query, and close work share a two-second budget. Any failure or timeout returns `503 {"status":"degraded","database":"unavailable"}`.
- Every response uses `Cache-Control: no-store`; the endpoint never creates or invokes an analysis provider or model.
- Responses contain no database errors, credentials, paths, queries, stack traces, provider details, or other internals.

Check local readiness after starting the app:

```bash
curl -i http://localhost:3000/api/health
```

## Commands

```bash
pnpm dev        # start the local development server
pnpm lint       # run ESLint
pnpm typecheck  # check strict TypeScript
pnpm test       # run the Vitest suite once
pnpm build      # create the production build
pnpm start      # serve the production build
pnpm db:migrate:local # apply committed migrations to local PGlite
pnpm db:migrate:neon  # apply the same migrations to Neon
```

CI runs the frozen install, lint, typecheck, test, and production build commands for every pull request into `main`.

## Accessibility and browser support

- The brief board and submission form use semantic headings, labels, field-level errors, live status messages, visible keyboard focus, and a skip link.
- Keyboard-only use is supported for navigation, form entry, validation recovery, and submission.
- Layouts adapt from a two-column desktop presentation to a single-column mobile flow, and motion respects `prefers-reduced-motion`.
- The supported baseline is the current and previous major versions of Chrome, Edge, Firefox, and Safari.

## Project guidance

- Engineering standards: [`docs/constitution.md`](docs/constitution.md)
- Approved delivery plan: [`docs/superpowers/plans/2026-08-22-studio-os.md`](docs/superpowers/plans/2026-08-22-studio-os.md)

## Current scope

- Included: accessible brief list, submission, detail, analysis, and retry screens; strict TypeScript; shared Zod contracts; PostgreSQL persistence; PGlite and Neon adapters; versioned analysis prompt; deterministic mock and OpenAI providers; bounded analysis service; brief workflow APIs; atomic retries; database-aware health checks; safe request errors; linting; tests; production build; CI; and environment examples.
- Deferred: architecture and ownership documentation, CI-owned production release, and production verification.
