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
| `pnpm db:migrations:check` | Verify the Drizzle schema matches committed migration history |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Check strict TypeScript |
| `pnpm test` | Run the Vitest suite once |
| `pnpm test:watch` | Run Vitest in watch mode |
| `pnpm build` | Create a production build |
| `pnpm start` | Serve an existing production build |

## API Endpoints

| Method and path | Purpose |
| --- | --- |
| `POST /api/briefs` | Validate, save, and analyze a new brief |
| `POST /api/briefs/{id}/analysis` | Retry a failed or stale analysis |
| `GET /api/health` | Check database readiness without calling the AI provider |

See [Architecture](docs/ARCHITECTURE.md) for the data flow, schema, contracts, and field-change guide.

## Deployment and database migrations

Vercel Git integration owns application deployments. A pull request creates a Preview deployment, and a change to `main` creates a Production build. GitHub Actions never deploys the application.

For pull requests and `main`, GitHub Actions installs the locked dependencies, applies every committed migration to a clean PGlite database, checks that the Drizzle schema matches the migration history, then runs lint, typecheck, the full test suite, and a production build.

After the quality gate passes on `main`, the `Production database migration` job runs `pnpm db:migrate` against Neon. The job uses the protected GitHub `production` environment and its `DATABASE_URL` secret. It runs on every `main` update; already-applied migrations are safe no-ops.

Vercel must require `Production database migration` as a [Deployment Check](https://vercel.com/docs/deployment-checks). A deployment check is a release gate: Vercel may build the new version while GitHub Actions runs, but it keeps the current Production deployment live unless the migration job succeeds.

Configure the platforms as follows:

| Platform scope | Required settings |
| --- | --- |
| GitHub `production` environment | Restrict deployments to `main`; store only the production Neon `DATABASE_URL` secret |
| Vercel Preview | `APP_ENV=preview`, `DATABASE_DRIVER=neon`, runtime `DATABASE_URL`, `AI_PROVIDER`, and provider settings |
| Vercel Production | `APP_ENV=production`, `DATABASE_DRIVER=neon`, runtime `DATABASE_URL`, `AI_PROVIDER`, and provider settings |

Keep `OPENAI_API_KEY` and every database URL server-only. Do not add a `NEXT_PUBLIC_` prefix. GitHub and Vercel keep separate copies of the production database URL because the migration job and the running application have different owners.

Complete the one-time platform setup in this order:

1. Import the `mr-rob0to/studio-os` GitHub repository into Vercel and keep Git deployments enabled.
2. Add the Preview and Production runtime settings from the table above to the Vercel project.
3. In the Vercel Production environment, keep automatic production aliasing enabled.
4. Add `Production database migration` as the required Deployment Check.
5. In the GitHub `production` environment, select only the `main` branch and add the production Neon `DATABASE_URL` secret.

Pull requests validate migrations with clean PGlite only. This release does not create a Neon database branch per pull request and does not migrate Preview Neon automatically. Apply committed migrations to the shared Preview database through an approved operator process before testing a preview that depends on new schema.

If a production migration fails, the stable GitHub check fails and Vercel keeps the previous deployment live. Fix the migration with a compatible forward change; do not automatically roll the database back. Migrations must remain compatible with the current Production application because Vercel can finish its build before the database gate completes.

## Key trade-offs

1. The app completes AI analysis before it finishes the submit or retry request. This keeps the workflow simple, but there is no background queue for longer-running analysis.
2. The pages and backend API live in the same Next.js app. This is simpler for a first version, but a larger product would likely separate the client and backend so they can be changed and released independently.
3. Each brief has one analysis record that is updated when analysis is retried. This keeps the first version simple, but past analysis runs are not kept as permanent records, so there is no history or reporting across runs.

## Intentionally not built

- Authentication or authorization
- Brief editing or deletion
- Uploads, comments, collaboration, or analysis history
- Background jobs, model routing, provider fallback, or external monitoring
- A separate public API


## Future enhancements

- Add authentication and role-based access before use outside a trusted internal team.
- Add ways to measure and improve AI analysis quality.
- Add file uploads.
- Connect Slack, Jira, and Google Drive for notifications and workflow automation.
- Add real-time collaboration for multiple users.
- Add brief editing with version history and explicit analysis invalidation rules.
- Move long-running analysis to background jobs with progress and operational monitoring.
- Add richer deployment monitoring and automated rollback analysis.

## AI assistance

AI helped draft the delivery plan, implementation, tests, code review, and documentation. I set the product scope and architecture constraints. I also used established agent workflows for specification-driven development, project standards, test-first development, and independent AI code reviews.

I consistently guided the AI away from unnecessary complexity and toward clear, developer-friendly documentation. I personally performed the final review for every pull request.

## Documentation

- [Architecture](docs/ARCHITECTURE.md): system flow, schema, endpoints, and safe extension steps.
- [Engineering constitution](docs/constitution.md): binding development and delivery standards.
