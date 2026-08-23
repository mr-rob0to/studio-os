# Studio OS

Studio OS is an internal animation-studio brief application. A teammate submits a creative brief, the application saves it, an AI provider returns a structured readiness review, and the team can read the result or retry a failed analysis.

The application includes a brief board, a submission form, brief detail and analysis views, safe retry behavior, and a database health endpoint.

## Local setup

### Prerequisites

- Node.js 22
- pnpm 10.33.0
- Git

From a clean clone:

```bash
git clone https://github.com/mr-rob0to/studio-os.git
cd studio-os
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm db:migrate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The root route redirects to `/briefs`.

The copied environment uses file-backed PGlite and a deterministic mock AI provider. `.env.local` and local database files under `.pglite/` are ignored by Git and must not be committed.

Confirm the database is ready:

```bash
curl --fail --show-error http://localhost:3000/api/health
```

Expected response:

```json
{"status":"healthy","database":"ready"}
```

### Environment selection

| Environment | Database settings | Database |
| --- | --- | --- |
| Local | `APP_ENV=local`, `DATABASE_DRIVER=pglite`, optional `PGLITE_DATA_DIR` | PGlite |
| Test | `APP_ENV=test`, `DATABASE_DRIVER=pglite` | Fresh in-memory PGlite |
| Preview | `APP_ENV=preview`, `DATABASE_DRIVER=neon`, `DATABASE_URL` | Neon HTTP |
| Production | `APP_ENV=production`, `DATABASE_DRIVER=neon`, `DATABASE_URL` | Neon HTTP |

Use the same migration command in every environment:

```bash
pnpm db:migrate
```

The command loads the environment, validates the environment and driver combination, then applies the committed migrations through PGlite or Neon. PGlite is rejected in preview and production. Neon requires a server-only `DATABASE_URL`.

For AI analysis, set `AI_PROVIDER=mock` or `AI_PROVIDER=openai`. OpenAI also requires a server-only `OPENAI_API_KEY`. The local example uses `MOCK_AI_MODE=success`; `malformed` and `timeout` exercise recoverable failure states.

## Project structure

| Path | Contents |
| --- | --- |
| `src/app/briefs/` | Brief board, new-brief page, and brief detail page |
| `src/app/api/` | Create, retry, and health Route Handlers |
| `src/components/` | Interactive form and retry controls plus brief presentation components |
| `src/contracts.ts` | Zod schemas for brief input, stored records, analysis output, and API errors |
| `src/server/briefs/` | Brief workflow, retry rules, runtime composition, and read services |
| `src/server/analysis/` | AI provider interface, prompt, adapters, timeout, and output parsing |
| `src/server/db/` | Drizzle repository, PGlite and Neon adapters, migrations, and health check |
| `src/server/http/` | Request validation and safe HTTP response mapping |
| `drizzle/` | Committed PostgreSQL migration history shared by PGlite and Neon |
| `docs/` | Architecture, engineering standards, and delivery plan |

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the local development server |
| `pnpm db:migrate` | Apply committed migrations for the configured environment |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Check strict TypeScript |
| `pnpm test` | Run the Vitest suite once |
| `pnpm test:watch` | Run Vitest in watch mode |
| `pnpm build` | Create a production build |
| `pnpm start` | Serve an existing production build |

## HTTP endpoints

| Method and path | Purpose |
| --- | --- |
| `POST /api/briefs` | Validate, save, and analyze a new brief |
| `POST /api/briefs/{id}/analysis` | Retry a failed or stale analysis |
| `GET /api/health` | Check database readiness without calling the AI provider |

See [Architecture](docs/ARCHITECTURE.md) for the data flow, schema, contracts, and field-change guide.

## Key trade-offs

1. Analysis runs inside the request. This keeps ownership and recovery simple, but the request is bounded by the provider timeout and is not suitable for long-running work.
2. PGlite is used locally and Neon is used when hosted. Contributors need no external database for local work, but both adapters must stay compatible with one Drizzle schema and migration history.
3. Each brief keeps one current analysis row. Reads and retries stay simple, but the application does not retain analysis history.

## Intentionally not built

- Authentication or authorization
- Brief editing or deletion
- Uploads, comments, collaboration, or analysis history
- Background jobs, model routing, provider fallback, or external monitoring
- Deployment automation or a separate public API

These are product and operational boundaries, not incomplete hidden flows.

## Future enhancements

- Add authentication and role-based access before use outside a trusted internal team.
- Add brief editing with version history and explicit analysis invalidation rules.
- Move long-running analysis to background jobs with progress and operational monitoring.
- Add production release automation, deployment verification, and rollback guidance.

## AI assistance

AI helped draft the delivery plan, implementation, tests, code review, and documentation. The maintainer set the product scope and architecture constraints, requested the single environment-aware migration command, replaced over-detailed internal documentation with contributor-focused guidance, and made the final acceptance decisions.

## Documentation

- [Architecture](docs/ARCHITECTURE.md): system flow, schema, endpoints, and safe extension steps.
- [Engineering constitution](docs/constitution.md): binding development and delivery standards.
