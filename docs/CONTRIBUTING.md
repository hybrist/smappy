# Contributor Guide

Welcome to the Smappy contributor guide. This document describes the end-to-end
workflow for proposing changes, keeping your environment healthy, and getting
pull requests merged quickly.

## Prerequisites

- **Node.js 20+** – match the version used in CI to avoid subtle dependency
  issues.
- **pnpm 10+** – the project uses `pnpm` as the primary package manager
  (`packageManager` is pinned in `package.json`).
- **GitHub CLI (`gh`)** – several workflows rely on the commands documented
  below.

Install dependencies the first time you clone the repository:

```bash
pnpm install
```

## Local Development Setup

- Seed the SQLite database with realistic bundle analysis data when you need a
  populated dashboard:

  ```bash
  pnpm run db:seed
  ```

  See `src/lib/server/db/README.md` for additional seeding options.

- Start the development server:

  ```bash
  pnpm run dev
  # visit http://localhost:5173/dashboard
  ```

- Storybook and other supporting tooling are available through additional
  scripts in `package.json`.

## Picking an Issue

1. Sync remote references before selecting work:

   ```bash
   git fetch --all --prune
   ```

2. List candidate issues (non-documentation, not blocked) with the shared
   search query:

   ```bash
   gh issue list --search 'is:issue state:open -label:documentation -is:blocked'
   ```

3. Confirm that no remote branch already references the issue number:

   ```bash
   git branch -r | grep issue-<number>
   ```

   Skip the issue if any remote branch matches.

## Branching Strategy

- Always branch from the latest `origin/svelte`:

  ```bash
  git switch -c feature/issue-<number>-short-slug origin/svelte
  git push -u origin feature/issue-<number>-short-slug
  ```

- Push the empty branch immediately. This advertises that the issue is
  in-progress and prevents duplicate work.

- Keep unrelated work in separate branches. Use `git stash` to temporarily save
  unrelated changes when switching contexts.

## Development Workflow

- Follow the existing code style. Prettier and ESLint are configured for the
  project:

  ```bash
  pnpm run format       # writes formatting fixes
  pnpm run lint         # runs prettier --check and eslint .
  pnpm run check        # Svelte + TypeScript checks
  ```

- Run tests relevant to your change before pushing:

  ```bash
  pnpm run test         # unit tests (vitest)
  pnpm run test:e2e     # Playwright; run when UI flows are affected
  ```

- Database changes should include migrations created via Drizzle (`pnpm run
db:generate` / `pnpm run db:push`). Document schema changes in `schema/` as
  needed.

- Documentation updates belong in `docs/`. Re-run `pnpm run format` to ensure
  markdown files stay formatted.

## Commit and Pull Request Guidelines

- Write focused commits with descriptive messages. Reference the issue number in
  commit bodies when helpful.

- Open pull requests against the `svelte` branch. The PR description must
  include the closing trailer so GitHub auto-closes the issue when merged:

  ```
  Closes #<number>
  ```

- Before pushing, ensure the workspace is clean and all automated checks pass:

  ```bash
  pnpm run format:check
  pnpm run lint
  pnpm run check
  pnpm run test
  ```

- After opening the PR:
  - Monitor GitHub Actions until all workflows succeed.
  - Respond promptly to review comments or suggestions.
  - Update the branch (`git fetch origin && git rebase origin/svelte`) if the
    base branch moves.

## Additional Resources

- Bundler integration overview: `docs/bundler-integration/README.md`
- Database utilities and seeding: `src/lib/server/db/README.md`
- Issue templates and labels live in the GitHub repository settings.

Thank you for contributing! Continuous improvements from the community make the
Smappy ecosystem stronger for everyone.
