# Studio OS

Studio OS is an internal animation-studio brief application. It currently provides shared brief contracts and PostgreSQL persistence. Analysis, HTTP endpoints, and product screens arrive in later tasks.

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

Open [http://localhost:3000](http://localhost:3000). The current shell does not yet read from the database.

## Database environments

- Local development uses `DATABASE_DRIVER=pglite` and writes only to `PGLITE_DATA_DIR`.
- Tests create a fresh in-memory PGlite database and apply the same committed migration.
- Preview and production use `DATABASE_DRIVER=neon` plus a server-only `DATABASE_URL`; Vercel preview and production reject PGlite before it can load. Put the URL in an ignored `.env.local` locally or in sensitive deployment configuration, never in `NEXT_PUBLIC_` variables.
- Apply the same committed migration to Neon with `pnpm db:migrate:neon`. This command requires `DATABASE_URL`; it does not use `drizzle-kit push`.

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

## Project guidance

- Engineering standards: [`docs/constitution.md`](docs/constitution.md)
- Approved delivery plan: [`docs/superpowers/plans/2026-08-22-studio-os.md`](docs/superpowers/plans/2026-08-22-studio-os.md)

## Current scope

- Included: accessible app shell, strict TypeScript, shared Zod contracts, PostgreSQL persistence, committed migrations, PGlite local/test support, Neon server-only composition, linting, tests, production build, CI, and environment examples.
- Deferred: analysis providers, workflow APIs, product screens, health checks, and deployment.
