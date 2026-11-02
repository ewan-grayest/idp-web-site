# ID project website

Next.js 16 + Payload CMS 3 + PostgreSQL, one app and one Docker image.
Source: https://github.com/ewan-grayest/idp-web-site. Requirements and component coverage: [SPEC-COMPLIANCE.md](SPEC-COMPLIANCE.md).

## Specification implementation (v0.1.1)

| Spec | Where |
|---|---|
| Design tokens (slide 0, design system v0.1) | `src/styles/tokens.css` |
| 17 page roles and permalinks | `src/lib/routes.ts` |
| 0.1 Header: logo, section title, phone, enquiry + consent, search | `src/components/shell/Header.tsx` |
| 0.3 Footer | `src/components/shell/Footer.tsx`, links in `src/lib/site.ts` |
| 1 Home: opposing sliders 1.2/1.3 of the projects ticked for Home (name, «Смотреть проект», ‹ ›, one progress segment per project, «Пауза» on hover, swipe on phones), floating logo 1.1 (opens Promo); the promo video plays over Home on a visitor's first visit (`/?intro` replays it) | `src/components/home/HomeSliders.tsx`, `src/app/(frontend)/[locale]/page.tsx` |
| 2 Promo video: uploaded in the admin (Студия → Промо-видео), a wordless placeholder clip until then | `src/components/promo/PromoVideo.tsx`, `public/promo-placeholder.*` |
| 3 Studio and team: mission, team strip with an open card (photo, quote, link to Person), history timeline, online journal, map and address, company enquiry, partner tiles | `src/app/(frontend)/[locale]/studio`, `src/components/studio/`, `src/globals/Studio.ts`, `src/collections/Issues.ts` |
| 4 Person: wide photo, role, name (header title), quote, interests, achievements timeline, their projects and tags, "ask me" enquiry | `src/app/(frontend)/[locale]/team/[slug]`, `src/components/person/`, `src/lib/person.ts` |
| 5 / 8 / 16 Project page: strip + viewer with shop hotspots, author, tags, concept/preview/process, sharing + short links, achievements timeline, enquiry CTAs, recommendations | `src/app/(frontend)/[locale]/projects/[kind]/[slug]`, `src/components/project/` |
| 7 / 9 / 17 All projects of a kind: tag filter (up to 5 tags, «Выбрать» applies, `?tags=a,b` in the address), grid with a green hover veil and the project name, «Узнать ещё больше о проектах» enquiry | `src/app/(frontend)/[locale]/projects/[kind]/page.tsx`, `src/components/collection/`, `getCollection` in `src/lib/projects.ts` |
| 6 Partners and Get-Together: scheme text, logo buttons that pick a partner (its text, «Как получить», photo, discount, projects and tags; `/partners#slug`), map and partnership contacts, enquiry | `src/app/(frontend)/[locale]/partners`, `src/components/pages/PartnersView.tsx`, `src/collections/Partners.ts` |
| 10 Press «О нас пишут»: sideways slider of wide photos (own or the project's), source and date, opens the article | `src/app/(frontend)/[locale]/press`, `src/collections/Press.ts` |
| 11 / 13 / 14 Lifestyle, Careers, Legal: vertical timeline (newest on top) beside the picked entry's title, photos and text; `#slug` opens an entry; 11 adds sharing; 14 starts with the company details (Студия → Реквизиты 14) | `src/components/pages/EntriesPage.tsx`, `src/collections/entries.ts` |
| 12 / 15 Payment, Media and PR: one admin text each (Тексты страниц) and «Вернуться» | `src/components/pages/TextPage.tsx`, `src/globals/PageTexts.ts` |
| Reusable timeline (3.3, 4.2, 5.8), section rise motion, header title per section | `src/components/shared/` |
| Leads (enquiries) stored in Postgres | `src/collections/Leads.ts`, `POST /api/v1/leads` |
| Dark/light switch (design tokens v1.0): follows the system setting, remembers the visitor's choice; Home, Promo and the photo viewer stay dark | `src/styles/tokens.css`, `src/lib/theme.ts` |
| Languages: Russian (default, `/studio`), English (`/en/studio`), Chinese (`/zh/studio`); switch in the header, footer and on Home; translatable content with Russian fallback | `src/i18n/`, `src/proxy.ts`, `localization` in `src/payload.config.ts` |
| Site menu (not in the spec; added 2026-10-25 when Ewan found no navigation): the header's last button opens every section, contacts, languages and the theme switch; Home has none (Ewan, 2026-10-25) | `src/components/shell/SiteMenu.tsx`, `menuMain` / `menuMore` in `src/lib/site.ts` |
| CMS admin, in Russian, English or Chinese; "Open site" and "Log out" always in its top bar; side menu grouped as projects and team / site pages / enquiries, files, access; contacts, social links and company details in Студия | `/admin`, `src/components/admin/`, `groups` in `src/collections/labels.ts` |

All 17 page roles use the shared templates. `/team` permanently redirects to `/studio#team`; individual people remain at `/team/[slug]`. Unknown nested URLs return 404. The generated `/sitemap.xml` includes the public routes and entity pages in all three languages.
Legal drafts and the press articles found online load with `npx payload run scripts/fill-pages.ts` (safe to re-run).
Components carry their spec IDs in `data-spec` attributes. Shared project and collection templates use the reference IDs from pages 5 and 7; the outer `data-spec` identifies the actual page role (5/8/16 or 7/9/17). Add `?ids=1` for existing inline badges, and inspect `data-spec` for the full traceability surface.

## Run the site on this Mac (Docker)

1. Install and open **Docker Desktop** (free for personal use and small businesses) and wait until it says it's running.
2. In Terminal, in this folder: `./start.sh`

The first start builds the site, which takes a few minutes. It then opens http://localhost:3000.
The admin panel is at http://localhost:3000/admin, and the first visit asks you to create an account.
Your data (database and uploaded photos) is kept between restarts, in Docker volumes unless you pick folders (see "Where the data is kept").

- Stop: `docker compose stop`. Start again: `./start.sh`, which also rebuilds after code changes.
- Logs: `docker compose logs -f app`
- Settings live in `.env` (created on first start). After changing the phone number or site address there, run `./start.sh` again.
- The site only answers on this computer (localhost), not on your network.

## Where the data is kept

Two settings in `.env` (on the server: `deploy/.env`) choose where the content lives, outside the container:

| Setting | What | Empty (default) |
| --- | --- | --- |
| `MEDIA_DIR` | Uploaded photos and videos | Docker volume `media` |
| `PGDATA_DIR` | Database files (PostgreSQL) | Docker volume `pgdata` |

Use full paths, for example `MEDIA_DIR=/Users/<you>/IDP data/media` or a mounted disk on the server (`/srv/idp/media`).
Then run `./start.sh` again (server: the same `up -d --build`). Removing the settings switches back to the volumes, which are never deleted.

- On a Mac, Docker Desktop must be allowed to use the folders: Settings > Resources > File sharing, add the folder
  (or one above it, e.g. `/Users/<you>/IDP data`), Apply & restart. `./start.sh` checks this and says so if it is missing;
  without it Docker would quietly keep the data inside its own disk instead of in your folder.
- `PGDATA_DIR` must point to an empty folder the first time: PostgreSQL creates its files there.
- The app gives the `MEDIA_DIR` folder to its own user (uid 100) when it starts, so no `chown` is needed by hand.
- `npm run dev` also reads `MEDIA_DIR` (otherwise it writes to `./media`); its database is `DATABASE_URI`.

Pointing the settings at new folders starts with an empty site. To carry the current content over, stop the site and copy the volumes
into the folders first (`site_` is this folder's name; `docker volume ls` lists them):

```bash
docker compose stop
docker run --rm -v site_media:/from -v "/Users/<you>/IDP data/media":/to --entrypoint cp postgres:16 -a /from/. /to/
docker run --rm -v site_pgdata:/from -v "/Users/<you>/IDP data/postgres":/to --entrypoint cp postgres:16 -a /from/. /to/
```

## Backups

Full backup (database and uploaded media) and restore, for the local dev site and production: see [BACKUP.md](BACKUP.md).
In the admin: «Резервные копии» (`/admin/backups`) makes, checks, downloads, uploads, restores and deletes backups.
In Terminal: `scripts/backup.sh`, `scripts/restore.sh backups/<file>.tar`; nightly: `scripts/schedule-backup.sh on` (add `--prod` on the server).

The local backup-folder mount can be configured with `BACKUPS_MOUNT` (`./backups` by default). On this Mac it is `backups`, a Docker volume, because Docker Desktop refused the host-folder mount. All existing backups were preserved and copied into the volume. See [the fallback notes](BACKUP.md#docker-desktop-folder-sharing-fallback) before mixing admin and Terminal backup operations.

## Develop with live reload

Needs Node 20.9+ and Docker (for the database only).

```bash
cp .env.example .env          # then set PAYLOAD_SECRET to a long random string
docker compose up -d db       # only the database (stop the full stack first: docker compose stop app)
npm install
npm run dev                   # http://localhost:3000, admin at /admin
```

The first visit to `/admin` asks you to create the first editor account.
For sample content (clearly marked [Пример], grey placeholder photos): `npx payload run scripts/seed.ts`,
then open `/projects/residential/sample-loft` and `/projects/public/sample-cafe` (and `/en/…`, `/zh/…` for the sample translations).
Tick «Показывать в слайдере на главной» on projects (Проекты in the admin) to replace the numbered placeholder slides: public projects go left, residential right, ordered by «Порядок на главной».

## Checks

```bash
npm run lint        # TypeScript
npm test            # unit tests (Vitest)
npx playwright install chromium && npm run test:e2e   # browser tests, desktop + phone; the intro video settings tests run last, on their own
npm run build
```

## Schema changes

In development the database schema follows the code automatically.
Before deploying a change, run `npx payload migrate:create <name>`; the production image applies migrations on start.

## Languages

- Interface texts (buttons, menus, forms, page titles) live in `src/i18n/dictionaries/` — one file per language,
  with the same keys as `ru.ts` (a unit test checks nothing is missing). The Chinese file is a draft: have a native speaker review it.
- Content (projects, people, studio texts, tags, journal issues, photo descriptions) is translated in the admin:
  pick the language in the top bar ("Локаль") and fill in the fields. Russian is required; anything not yet translated
  shows in Russian on the other-language pages.
- Pages in `src/app/(frontend)/[locale]/` get the language from the address. Use `Link` from `@/i18n/Link` for internal links,
  `useI18n()` in client components and `getT()` / `getLocale()` in server code.
- Adding a language: its code in `src/i18n/locales.ts`, a dictionary file, its admin language in `payload.config.ts`, then `npx payload migrate:create`.

## Server hosting

Not in use: the site runs locally for now. `deploy/` holds a ready setup for one server (site, database, HTTPS) for later.

## Settings, feeds and reviews

In the CMS, **Site settings and integrations** controls tag limits (default 5), feed caps (Studio/Person/GT 12, project 3), latest reviews (5), exact hashtag filters, map provider, feed/review visibility and social provider settings. All caps are integers from 1–100 and are enforced on the server. Map coordinates and zoom remain in Studio → Contacts.

**VK integration is disabled by default**, as requested on 2 November 2026. To enable it, enter a registered public VK site/app ID and enable the switch. The SDK only loads after a visitor opens social comments. An empty Facebook app ID keeps its external comment plugin disabled. The visitor's selected network is remembered; a recognized social referrer is used as a fallback. Browser login sessions on other domains cannot be inspected.

**Social feeds** stores approved Instagram post URLs, uploaded thumbnails, dates and hashtags. Choose Studio, GT, a person or a project; only published posts for that entity appear, newest first, within its configured cap. This curated feed works without an API token. Automatic Instagram synchronization requires a separately authorized provider; it is not enabled or represented as a live account connection.

**Reviews** stores project-specific reviews with moderation. Anonymous reviews require consent and cannot set their own approval status. Only approved reviews are public; origin URLs and consent are readable by staff only. Local website reviews are not automatically posted to VK/Facebook. Once configured, the optional provider widgets handle their own sign-in and comments. Live provider behavior requires a registered domain/app and provider acceptance testing.

Project and blog sharing use stable `/p/<code>` redirects. Existing blog entries receive short codes during migration. Facebook is `.1` and VK is `.2` under both `5.7` and `11.2`, matching the specification.

## Versioning and source control

Use the configured `origin`: `https://github.com/ewan-grayest/idp-web-site.git`.

After cloning, install the tracked commit hook once:

```bash
npm run hooks:install
```

Before **every commit**, increment the version, then stage both version files:

```bash
npm run version:patch        # or version:minor / version:major
# stage the intended changes, including package.json and package-lock.json
npm run version:check
git commit
```

The hook checks the staged files, rejects unchanged/decreasing versions and requires the lockfile versions to match. GitHub Actions checks every new commit. Existing local history predates this policy; the initial push checks its tip. The current version appears in the footer. Tests for numerical version ordering are included.

## Verification against isolated data

The task's verification uses a separate database named `idp_spec_qa`; it never adds sample projects or test enquiries to the running site's database.

```bash
# create idp_spec_qa in the local PostgreSQL container first
DATABASE_URI=postgres://idp:idp@127.0.0.1:5432/idp_spec_qa npx payload migrate
DATABASE_URI=postgres://idp:idp@127.0.0.1:5432/idp_spec_qa MEDIA_DIR=/private/tmp/idp-qa-media npx payload run scripts/seed.ts
DATABASE_URI=postgres://idp:idp@127.0.0.1:5432/idp_spec_qa MEDIA_DIR=/private/tmp/idp-qa-media NEXT_PUBLIC_SITE_URL=http://localhost:3001 npm run dev -- --port 3001
# in another terminal, with that preview running:
DATABASE_URI=postgres://idp:idp@127.0.0.1:5432/idp_spec_qa MEDIA_DIR=/private/tmp/idp-qa-media npx payload run scripts/verify-spec.ts
```

The verifier creates marked fixtures only in that database and exercises page roles, caps, direct-URL filtering, map selection, consent, review moderation, private lead access, short URLs and sitemap behavior. It restores the default settings when done.

## Content and scope decisions

- The attachment contains inconsistent page references. The 17-role page map takes precedence: legal and consent documents are on 14, media/PR on 15, archive projects on 16/17. Shared template element IDs remain those printed in the spec.
- Roboto is self-hosted throughout. Brand tokens retain `#6d6d6d`, `#d2d2d2` and `#8dc63f`; neutral light/dark themes and readable type scales are retained.
- Logo `1.1` opens `/promo`; logo `0.1.1` opens Home. The supplemental navigation menu has a separate button. Header/footer are hidden on Home/Promo, with the full footer elsewhere, including Archive.
- The optional first-visit video remains controlled by the existing Studio promo switches. `/promo` always provides a replayable presentation. The uploaded film is preferred; a labeled placeholder is used when none is supplied.
- “Up to seven” in `5.1` means at most seven visible presentation frames on desktop, with horizontal scrolling for the unlimited `5.1.1` items. Mobile shows fewer frames.
- Feed and review sections need approved CMS content. Missing studio photos/text are editorial content to fill in the CMS; development fixtures are clearly marked and are not production content.
- ID Lab design/content remains TBD and its footer label is intentionally inactive. Checkout, job application forms and reward accounting are out of scope.
