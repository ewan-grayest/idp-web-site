@AGENTS.md

# ID project website

Marketing site and CMS for ID project, an interior design studio. One Next.js 16 + Payload CMS 3 app on PostgreSQL 16, shipped as one Docker image. Russian is the default language; English and Chinese are prefixed.

Read before changing the area:

- [docs/design.md](docs/design.md): tokens, themes, components, motion, page inventory, decisions that override the spec.
- [docs/technical.md](docs/technical.md): routing, data model, i18n, API, environment, deployment, testing.
- [README.md](README.md): how to run it, what is built, and the "Open assumptions" decision log.
- [BACKUP.md](BACKUP.md): backup and restore. Read it before touching `src/lib/backups.ts`, `src/endpoints/backups.ts` or `scripts/*backup*`.

## Commands

```bash
docker compose up -d db                  # database only, for local development
npm run dev                              # http://localhost:3000, admin at /admin
npm run lint                             # tsc --noEmit; there is no ESLint
npm test                                 # Vitest, tests/unit
npm run test:e2e                         # Playwright, desktop + phone; needs the database
npm run build
npx payload migrate:create <name>        # after any schema change
npm run generate:types                   # after any collection or global change
npm run generate:importmap               # after adding or moving an admin component
npx payload run scripts/seed.ts          # sample content, safe to re-run
./scripts/check-image.sh                 # build the image and check it starts the way hosts run it; needs Docker
```

Run one test with `npx vitest run tests/unit/routes.test.ts` or `npx playwright test tests/e2e/home.spec.ts --project=desktop`.

## Data locations

One layout in every setup: prod and dev, local and remote, `Dockerfile` and compose. Keep it that way in any code, script, compose file or doc you touch.

| Data | Inside the containers | Outside, in the data folder (`DATA_DIR`) |
|---|---|---|
| Uploaded photos and videos | `/data/media` (site) | `media/` |
| Backups, from the admin and `scripts/` | `/data/backup` (site) | `backup/` |
| PostgreSQL 16 files | `/data/db` (database, `PGDATA=/data/db`) | `db/` |

- The site and the database are always separate containers, on a hosting platform and in compose. Never put a database server in the site image; it only carries the PostgreSQL client tools for backups.
- `DATA_DIR` defaults to `./data` beside the compose file: `data/` locally, `deploy/data/` on the server. Every compose file bind-mounts `${DATA_DIR:-./data}/{media,backup,db}`; no named volumes for data (only `nextcache`, which holds resized images).
- The image sets `MEDIA_DIR=/data/media` and `BACKUPS_DIR=/data/backup`, and compose files set them again. `npm run dev` leaves them empty and uses `DATA_DIR`, through `src/lib/dataDirs.ts`. Read the folders through that helper, never `process.env.MEDIA_DIR` directly.
- `scripts/backup-common.sh` finds the backup folder from `DATA_DIR` the same way compose does.
- `scripts/move-data.sh [--prod]` moves data from the places used before 2026-11-08 (volumes `media`/`pgdata`, `MEDIA_DIR`/`PGDATA_DIR` folders, `backups/`). Don't reintroduce those names.

## Where things live

| Area | Path |
|---|---|
| Pages | `src/app/(frontend)/[locale]/` |
| Admin and REST/GraphQL | `src/app/(payload)/`, `/admin`, `/api/v1` |
| Language routing (Next 16 `proxy`, formerly middleware) | `src/proxy.ts` |
| Content schema | `src/collections/`, `src/globals/`, `src/payload.config.ts` |
| Data access for pages | `src/lib/` |
| Page roles and permalinks | `src/lib/routes.ts` |
| Components, with CSS Modules | `src/components/<area>/` |
| Design tokens | `src/styles/tokens.css` |
| Interface text | `src/i18n/dictionaries/{ru,en,zh}.ts` |

## Rules

**Spec traceability.** The 17 page roles are numbered by the technical specification, and component IDs such as `5.7.4` come from it. Put the ID in a `data-spec` attribute and in the doc comment of anything you build from it. `?ids=1` on any URL shows the IDs as badges.

**Design.**
- Use tokens from `tokens.css`: no raw hex, and `--c-bg`/`--c-text`/`--c-accent` rather than the v0.1 aliases (`--c-ground`, `--c-light`, `--c-green`).
- Everything must work in light and dark. Home, Promo and the photo viewer carry `.theme-dark` and stay dark.
- Green `--c-accent` is a fill or underline. Green text uses `--c-accent-text`; text on green uses `--c-on-accent`.
- Text over photos uses `--scrim-*` and `--on-photo-shadow`.
- Nothing may depend on hover alone: touch screens need another way to see it. Tap targets are at least 44px.
- Respect `prefers-reduced-motion` in JS as well as CSS. GSAP and autoplay must check it.

**Text and languages.**
- Interface text goes in all three dictionaries, with the keys of `ru.ts`. Never hard-code visible text in a component.
- Admin labels use `tr(ru, en, zh)` from `src/collections/labels.ts`.
- Translatable required fields use `...requiredInRussian`, not `required: true`, so a translation can stay unfinished.
- Internal links use `Link` from `@/i18n/Link`. Data helpers build plain unprefixed paths (`/studio#team`).
- Language: `getT()` / `getLocale()` on the server, `useI18n()` on the client. Always pass `locale` to Payload queries.

**Next.js and Payload.**
- Pages that read the CMS set `export const dynamic = 'force-dynamic'`, so edits show immediately.
- Read content through helpers in `src/lib/` using Payload's local API, and shape it for the page there.
- Collections are public-read only where the site needs it. Leads stay readable by signed-in staff only, and the public may only create them.
- A schema change needs a committed migration (`.ts`, `.json`, and its entry in `src/migrations/index.ts`) and regenerated `src/payload-types.ts`. Development pushes schema automatically; production only applies migrations.
- Avoid foreign runtime services and foreign billing: visitors are in Russia and such services may be unreachable. That is why fonts are self-hosted, the map is Yandex and Gravatar is off.

**Tests.** Add a unit test for pure logic in `src/lib` and `src/i18n`, and an e2e spec for visitor-facing behaviour. A spec that changes site-wide settings gets its own Playwright project that runs after `desktop` and `phone` (see `intro-options`, `home-name`).

**Decisions.** When the owner changes or settles behaviour the spec leaves open, record it as a bullet under "Open assumptions" in the README and in the code comment, in the existing form `(Ewan, YYYY-MM-DD)`.

**Repository.**
- `site/` has its own git repo, and the parent `IDP Site/` folder holds a separate one that also tracks it. Commands here act on the inner repo.
- `AGENTS.md` is rewritten by `next dev`: keep that block as it is.
- Never commit `.env`, `deploy/.env`, `data/`, `deploy/data/`, or the old `backups/` and `media/`. `.claude/` is ignored, so project docs for Claude go here or in `docs/`.
- Temporary, development-only and other non-production code goes in `extras/`. Git, Docker and `tsc` ignore it, so it is never committed or shipped. `scripts/` is for tooling the project keeps.
