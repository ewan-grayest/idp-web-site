<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## How this repo is run

- One developer working with AI assistants. Keep process minimal: don't add git hooks, CI gates, PR templates, changelogs or release tooling unless the developer asks for them.
- Development runs on the local Mac (`./start.sh`, or `npm run dev` with `docker compose up -d db`). Production is a Docker PaaS building `Dockerfile` from `main`; see `deploy/README.md`.
- Commit with plain, descriptive messages. Commits don't need a version bump.
- The version in `package.json` (shown in the site footer) changes only when deploying a release: `npm run version:patch` (or minor/major), commit, then deploy as in `deploy/README.md` → Release.
- There is no CI. Run `npm run lint` and `npm test` before pushing.
- **When the developer asks for a release, merge every branch into `main` and push `main` to GitHub.** That means all branches on `origin`, the `claude/*` session branches included, not only the one you are working on. Then bump the version and push again as in `deploy/README.md` → Release. This is the one time an assistant pushes to `main`. (Ewan, 2026-11-08)
