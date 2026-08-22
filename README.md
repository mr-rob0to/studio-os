# Studio OS

Studio OS is an internal animation-studio brief application. This first task establishes the executable Next.js foundation, shared engineering rules, and automated quality gates. Brief persistence and analysis arrive in later tasks.

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
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Task 1 does not connect to a database or model provider, so the placeholder values in `.env.local` are sufficient.

## Commands

```bash
pnpm dev        # start the local development server
pnpm lint       # run ESLint
pnpm typecheck  # check strict TypeScript
pnpm test       # run the Vitest suite once
pnpm build      # create the production build
pnpm start      # serve the production build
```

CI runs the frozen install, lint, typecheck, test, and production build commands for every pull request into `main`.

## Project guidance

- Engineering standards: [`docs/constitution.md`](docs/constitution.md)
- Approved delivery plan: [`docs/superpowers/plans/2026-08-22-studio-os.md`](docs/superpowers/plans/2026-08-22-studio-os.md)

## Current scope

- Included: accessible app shell, strict TypeScript, linting, tests, production build, CI, and environment variable examples.
- Deferred: brief contracts, PostgreSQL persistence, analysis providers, workflow APIs, product screens, health checks, and deployment.
