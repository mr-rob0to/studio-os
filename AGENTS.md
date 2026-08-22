# Studio OS Agent Instructions

- Read and follow [`docs/constitution.md`](docs/constitution.md) before planning or implementation.
- Treat [`docs/superpowers/plans/2026-08-22-studio-os.md`](docs/superpowers/plans/2026-08-22-studio-os.md) as the live delivery state.
- Use one fresh session, isolated worktree, branch, and pull request per numbered task.
- Fetch `origin/main`, branch from that fetched ref, and never mutate the reference checkout.
- Implement only the active approved task; explain scope expansion before changing it.
- Run the task's complete checks, inspect the diff, and run the changed application path.
- After a non-docs PR is open and its branch is finished, obtain exactly one fresh read-only Claude Code Fable review; do not run pre-PR or task-level code reviews.
- Resolve verified Critical and Important findings, log Minor findings, and re-review only a fixed Critical against the new commits.
- Rebase on fresh `origin/main`, update the plan status and task checkbox, and stop before the next task.
- Require a user scope checkpoint before adding a new capability, external service, or more than 30 minutes of unplanned work.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
