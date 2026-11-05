# ID project website

Next.js 16 + Payload CMS 3 + PostgreSQL, one app and one Docker image.
Source: https://github.com/ewan-grayest/idp-web-site. Requirements and component coverage: [SPEC-COMPLIANCE.md](SPEC-COMPLIANCE.md).
Personal data law (152-ФЗ) and what is left to do outside the code: [PERSONAL-DATA.md](PERSONAL-DATA.md).
Architecture overview: [docs/architecture.svg](docs/architecture.svg).

![Architecture](docs/architecture.svg)

## Specification implementation (v0.2.0)

| Spec | Where |
|---|---|
| Design tokens (slide 0, design system v0.1) | `src/styles/tokens.css` |
| 17 page roles and permalinks | `src/lib/routes.ts` |
| 0.1 Header: logo, section title, phone, enquiry + consent, search | `src/components/shell/Header.tsx` |
| 0.3 Footer | `src/components/shell/Footer.tsx`, links in `src/lib/site.ts` |
| 1 Home: opposing sliders 1.2/1.3 of the projects ticked for Home (name unless switched off per project, «Смотреть проект», ‹ ›, one progress segment per project, «Пауза» on hover, swipe on phones), floating logo 1.1 (opens Promo); the promo video plays over Home on a visitor's first visit (`/?intro` replays it) | `src/components/home/HomeSliders.tsx`, `src/app/(frontend)/[locale]/page.tsx` |
| 2 Promo video: uploaded in the admin (Студия → Промо-видео), a wordless placeholder clip until then | `src/components/promo/PromoVideo.tsx`, `public/promo-placeholder.*` |
| 3 Studio and team: mission, team strip with an open card (photo, quote, link to Person), history timeline, online journal, map and address, company enquiry, partner tiles | `src/app/(frontend)/[locale]/studio`, `src/components/studio/`, `src/globals/Studio.ts`, `src/collections/Issues.ts` |
| 4 Person: wide photo, role, name (header title), quote, interests, achievements timeline, their projects and tags, "ask me" enquiry | `src/app/(frontend)/[locale]/team/[slug]`, `src/components/person/`, `src/lib/person.ts` |
| 5 / 8 / 16 Project page: strip + viewer with shop hotspots, author, tags, concept/preview/process, sharing + short links, achievements timeline, enquiry CTAs, recommendations | `src/app/(frontend)/[locale]/projects/[kind]/[slug]`, `src/components/project/` |
| 7 / 9 / 17 All projects of a kind: tag filter (up to 5 tags, «Выбрать» applies, `?tags=a,b` in the address), grid with a green hover veil and the project name, «Узнать ещё больше о проектах» enquiry | `src/app/(frontend)/[locale]/projects/[kind]/page.tsx`, `src/components/collection/`, `getCollection` in `src/lib/projects.ts` |
| 6 Partners and Get-Together: scheme text, logo buttons that pick a partner (its text, «Как получить», photo, discount, projects and tags; `/partners#slug`), map and partnership contacts, enquiry | `src/app/(frontend)/[locale]/partners`, `src/components/pages/PartnersView.tsx`, `src/collections/Partners.ts` |
| 10 Press «О нас пишут»: sideways slider of wide photos (own or the project's), source and date, opens the article | `src/app/(frontend)/[locale]/press`, `src/collections/Press.ts` |
| 11 / 13 / 14 Lifestyle, Careers, Legal: vertical timeline (newest on top) beside the picked entry's title, photos and text; `#slug` opens an entry; 11 adds sharing; 14 starts with the company details (Студия → Реквизиты) | `src/components/pages/EntriesPage.tsx`, `src/collections/entries.ts` |
| 12 / 15 Payment, Media and PR: one admin text each (Тексты страниц) and «Вернуться» | `src/components/pages/TextPage.tsx`, `src/globals/PageTexts.ts` |
| Reusable timeline (3.3, 4.2, 5.8), section rise motion, header title per section | `src/components/shared/` |
| Leads (enquiries) stored in Postgres | `src/collections/Leads.ts`, `POST /api/v1/leads` |
| 152-ФЗ: consent boxes never pre-ticked or remembered, separate publication consent for reviews, «Журнал согласий» (time, IP, browser, wording, document versions; read-only, kept at least a year), cookie notice, Yandex map only after consent, no Google Maps or Facebook widget, policy linked on every page | `src/collections/Consents.ts`, `src/lib/consentLog.ts`, `src/lib/privacy.ts`, `src/components/shell/CookieNotice.tsx`, [PERSONAL-DATA.md](PERSONAL-DATA.md) |
| Dark/light switch (design tokens v1.0): follows the system setting, remembers the visitor's choice; Home, Promo and the photo viewer stay dark | `src/styles/tokens.css`, `src/lib/theme.ts` |
| Languages: Russian (default, `/studio`), English (`/en/studio`), Chinese (`/zh/studio`); switch in the header, footer and on Home; translatable content with Russian fallback | `src/i18n/`, `src/proxy.ts`, `localization` in `src/payload.config.ts` |
| Site menu (not in the spec; added 2026-10-25 when Ewan found no navigation): the header's last button opens every section, contacts, languages and the theme switch; Home has none (Ewan, 2026-10-25) | `src/components/shell/SiteMenu.tsx`, `menuMain` / `menuMore` in `src/lib/site.ts` |
| CMS admin, in Russian, English or Chinese; "Open site" and "Log out" always in its top bar, and the account button (top right) opens a menu with the signed-in email, "Account" and "Log out"; side menu grouped as projects and team / site pages / enquiries, files, access; contacts, social links and company details in Студия | `/admin`, `src/components/admin/`, `groups` in `src/collections/labels.ts` |

All 17 page roles use the shared templates. `/team` permanently redirects to `/studio#team`; individual people remain at `/team/[slug]`. Unknown nested URLs return 404. The generated `/sitemap.xml` includes the public routes and entity pages in all three languages.
Legal drafts and the press articles found online load with `npx payload run scripts/fill-pages.ts` (safe to re-run). `REFRESH_DRAFTS=1` also replaces legal documents still marked «[Черновик» with the current drafts.
Components carry their spec IDs in `data-spec` attributes. Shared project and collection templates use the reference IDs from pages 5 and 7; the outer `data-spec` identifies the actual page role (5/8/16 or 7/9/17). Add `?ids=1` for existing inline badges, and inspect `data-spec` for the full traceability surface.

## Run the site in the local environment (Docker)

1. Install and open **Docker Desktop** (free for personal use and small businesses) and wait until it says it's running.
2. In Terminal, in this folder: `./start.sh`

The first start builds the site, which takes a few minutes. It then answers at http://localhost:3000; run `./start.sh --open-browser` to have it opened for you.
The admin panel is at http://localhost:3000/admin, and the first visit asks you to create an account.
Your data (database and uploaded photos) is kept between restarts, in Docker volumes unless you pick folders (see "Where the data is kept").

- Stop: `docker compose stop`. Start again: `./start.sh`, which also rebuilds after code changes and then removes the old image versions and build cache this leaves behind, to keep disk space free. Volumes are never touched.
- Logs: `docker compose logs -f app`
- Settings live in `.env` (created on first start). After changing the phone number or site address there, run `./start.sh` again.
- The site answers at localhost and on the local network. To keep it to localhost, change the port in `docker-compose.yml` to `'127.0.0.1:3000:3000'`.

## Where the data is kept

Two settings in `.env` (on the server: `deploy/.env`) choose where the content lives, outside the container:

| Setting | What | Empty (default) |
| --- | --- | --- |
| `MEDIA_DIR` | Uploaded photos and videos | Docker volume `media` |
| `PGDATA_DIR` | Database files (PostgreSQL) | Docker volume `pgdata` |

Use full paths, for example `MEDIA_DIR=/Users/<you>/IDP data/media` or a mounted disk on the server (`/srv/idp/media`).
Then run `./start.sh` again (server: the same `up -d --build`). Removing the settings switches back to the volumes, which are never deleted.

- In the local environment, Docker Desktop must be allowed to use the folders: Settings > Resources > File sharing, add the folder
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
Tick «Показывать в слайдере на главной» on projects (Проекты in the admin) to replace the numbered placeholder slides: public projects go left, residential right, ordered by «Порядок на главной». Untick «Показывать название на слайде главной» to leave a project's name off its slide (on by default); the title stays required, since the project page and lists use it.

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

Development runs in the local environment (`./start.sh`). Production is a Docker host; the release steps are in [deploy/README.md](deploy/README.md).

One image runs on any Docker host. Everything specific to a host (address, secrets, database, folders) comes in as settings when the container starts, so moving hosts or changing address needs no rebuild. Pick the setup that fits:

| The host gives you | Use | Database | HTTPS |
| --- | --- | --- | --- |
| A server with Docker, and ports 80 and 443 free | `deploy/docker-compose.prod.yml`, steps in [deploy/README.md](deploy/README.md) | Container | Caddy, included |
| Docker with its own proxy and HTTPS: a hosting panel, or nginx on a shared server | `deploy/docker-compose.behind-proxy.yml` | Container | The host |
| One container and a managed database: a container platform | The `Dockerfile`, or an image you built and pushed | The host | The host |

**Not supported:** hosts that keep no files between deploys, such as serverless containers. Uploads live on disk, so they would disappear.

**Behind your own proxy.** Fill in `deploy/.env`, or enter the same settings in the panel and point it at the file:

```bash
docker compose -f deploy/docker-compose.behind-proxy.yml --env-file deploy/.env up -d --build
```

The site is then on `127.0.0.1:3000`. Set `APP_BIND` to change that, for example `8080` for all interfaces. Use backups from the admin («Резервные копии») in this setup, because `scripts/restore.sh` expects `docker-compose.prod.yml` and would also start Caddy.

**One container.** A host that builds from the repository needs nothing more than the settings below; `.env.hosting.example` lists them ready to copy into a hosting panel. To build elsewhere and push the image, adding `--platform linux/amd64` when the host's processor differs from the one building:

```bash
docker build -t <registry>/idp-site .
```

```bash
docker push <registry>/idp-site
```

**Check before trying a new host.** This builds the image with no build arguments and starts it the way hosts do: settings as variables only, with the host's own port and user. It uses a throwaway database and touches no real data:

```bash
./scripts/check-image.sh
```

### Required settings

All are read when the container starts: change one and recreate the container (`up -d`), with no rebuild. The `NEXT_PUBLIC_` prefix is a leftover in the names and has no effect on when they are read.

| Setting | Value | If it is wrong |
| --- | --- | --- |
| `PAYLOAD_SECRET` | Long random string (`openssl rand -hex 32`). Keep it unchanged | Empty: the container stops and says so. Changed: everyone must sign in again |
| `DATABASE_URI` (or `DATABASE_URL`) | `postgres://user:password@host:5432/idp`, with special characters in the password URL-encoded. The compose files in `deploy/` build it from `POSTGRES_PASSWORD` | Empty: the container stops and says so. Wrong: every page fails |
| `POSTGRES_PASSWORD` | Compose files in `deploy/` only. `openssl rand -hex 32`. PostgreSQL reads it only when it creates the database, so changing it later also needs `ALTER USER` in the database | Every page fails with `password authentication failed` |
| `NEXT_PUBLIC_SITE_URL` | Site address: `https://example.ru` | Empty: links and share addresses point to `localhost`, with a warning in the log |
| `SITE_DOMAIN` | `docker-compose.prod.yml` only. Domain without the scheme: `example.ru` | Caddy can't get a certificate |
| `NEXT_PUBLIC_STUDIO_PHONE` | Optional fallback phone | |
| `NEXT_PUBLIC_PROMO_VIDEO_URL` | Optional, used when no video is uploaded | |
| `MEDIA_DIR`, `PGDATA_DIR` | Compose only. Optional server folders, see "Where the data is kept" | |
| `APP_BIND` | `docker-compose.behind-proxy.yml` only. Where the proxy reaches the site, default `127.0.0.1:3000` | |

The image already sets the rest, so leave these alone unless the host needs otherwise:

| Setting | Value | Why |
| --- | --- | --- |
| `NODE_ENV` | `production` | Any other value skips migrations and lets the app change the database schema by itself |
| `PORT` | `3000` | A host may set its own, and the site follows it |
| `HOSTNAME` | Always `0.0.0.0`, whatever the host sets | Otherwise Next.js listens on the container's name only, so health checks to `localhost` fail |
| `MEDIA_DIR`, `BACKUPS_DIR` | `/app/media`, `/app/backups` | Folders inside the container. With only the image and a host that allows one disk, mount it at `/data` and set `/data/media` and `/data/backups`. The compose files keep these paths and use `MEDIA_DIR` for the server folder instead |
| `BACKUP_MODE` | `prod` | Names of backups made from the admin |

Run every Compose command from the site folder with `-f` and the compose file, and with `--env-file deploy/.env`. Without `--env-file`, the database password comes through empty.

### What the host must provide

- **Storage that survives redeploys:** the upload and backup folders above, and `/var/lib/postgresql/data` when the database is a container. `/app/.next/cache` is optional and only holds resized images.
- **PostgreSQL 16:** the backup tools in the image are version 16 and refuse a newer server. With a managed database, the role must be able to create tables. Restoring from the admin also needs `CREATEDB` and access to the `postgres` database. If its certificate is the provider's own, add `?sslmode=no-verify` to the address, or `self-signed certificate` appears in the log. Traffic stays encrypted, but the certificate isn't checked.
- **Automatic restart** (`restart: unless-stopped` or the host's equivalent): a restore from the admin ends the process and relies on the restart.
- **One running copy:** uploads are on one disk and migrations run at start, so don't scale the site to several copies.
- **Health check, if the host asks for one:** `/api/health` answers 200 once the database is readable and 503 otherwise. The first answer also applies migrations, so allow it up to 2 minutes. The image declares this as its Docker health check too.
- **Starting as root, ideally:** the image starts as root to give the upload folder to its own user (uid 100, gid 101), then drops to that user. If the host forbids root, the image runs as the user it is given, and that user must be able to write to the folders. The image's own folders already allow any user in group 0. If the host only forbids changing user, the site stays root and logs a warning.
- **Proxy:** forward to the site's port and keep the original `Host`, or set `X-Forwarded-Host` and `X-Forwarded-Proto`. A mismatch breaks saving in the admin. Allow large request bodies for video and backup uploads. Caddy in `deploy/` already does this.
- **Search engines:** only `deploy/Caddyfile` sends `X-Robots-Tag: noindex`. Behind any other proxy the site can be indexed from the first day, unless that proxy sends the header.
- **Network for Caddy:** ports 80 and 443 open and the domain's DNS pointing at the server, so Caddy can get its certificate.
- **Network for building:** Docker Hub, the npm registry and the Alpine package servers. Where Docker Hub is blocked, set `registry-mirrors` in the Docker daemon's settings, or build elsewhere and push the image.
- **Disk and memory:** keep about 20 GB free beyond the database and media, and about 2 GB of memory (or swap) for the build. A smaller host can run an image built elsewhere. These are rules of thumb: rebuild leftovers filled about 21 GB in the local environment.
- **Clean-up after each rebuild:** `docker image prune -f && docker builder prune -f`. Volumes are not touched. `./start.sh` does this locally, `deploy/` does not.

### Diagnostics page

Admin → «Обслуживание» → «Диагностика» (`/admin/diagnostics`) shows in one place what usually takes a look at the host's panel: every setting above with what is missing or wrong, whether the database answers and its migrations are applied, whether the upload and backup folders are writable and how much disk is free, whether the backup tools work, how old the latest backup is, and the site's latest log lines. «Скопировать отчёт» copies all of it as text, with the secret and passwords hidden, ready to send to the developer. Log lines are kept since the last start only; when the site doesn't start at all, the host's log is still the place to look.

### "A server error occurred. Reload to try again."

This is the generic Next.js page for any exception on the server. The root layout reads the CMS on every page, so a problem with the settings or the database takes down the whole site, and the reason appears only in the logs:

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env logs --tail=100 app db
```

```bash
df -h && docker system df
```

In the local environment, use `docker compose logs --tail=100 app db`.

| In the log | Cause | Fix |
| --- | --- | --- |
| `Can't start: the setting ... is empty` | The setting is empty, or the settings file is empty or wasn't loaded. The container stops and restarts | Set it and recreate the container. `up -d` is enough, no rebuild |
| `cannot connect to Postgres` | Wrong `DATABASE_URI`, or the database is down or still starting | Check the address and the `db` log |
| `password authentication failed` | `POSTGRES_PASSWORD` changed after the database was created | Restore the old value or run `ALTER USER` |
| `No space left on device`, `PANIC` in the `db` log | Disk full, which stops PostgreSQL | Run the clean-up above, then restart. Never prune volumes |
| `self-signed certificate` | A managed database uses the provider's own certificate | Add `?sslmode=no-verify` to `DATABASE_URI` |
| `Error running migration` (the app keeps restarting), `relation` or `column ... does not exist` | The database doesn't match the code, often after pushing a schema in dev mode | Restore a backup, or repair the failed migration. See below |
| `Invalid Server Actions request` | The proxy changes `Host` | Fix the proxy headers |

**No error, pages just hang:** the database was used by `npm run dev`, or restored from a backup of one. Dev mode leaves a marker row, and production then waits for a terminal answer that can never come. Check for it, and take a backup before changing anything:

```sql
select name, batch from payload_migrations where batch = -1;
```

Deleting that row lets production run, but any migration not yet recorded then runs against a schema dev mode may already have changed, and can fail with `Error running migration`. Avoid this by never pointing `npm run dev` at the hosted database. Local `npm run dev` and `./start.sh` share one database, so check a local backup for the row before restoring it on the host.

## Settings, feeds and reviews

In the CMS, **Site settings and integrations** controls tag limits (default 5), feed caps (Studio/Person/GT 12, project 3), latest reviews (5), exact hashtag filters, map provider, feed/review visibility and social provider settings. All caps are integers from 1–100 and are enforced on the server. Map coordinates and zoom remain in Studio → Contacts.

**VK integration is disabled by default**, as requested on 2 November 2026. To enable it, enter a registered public VK site/app ID and enable the switch. The SDK only loads after a visitor opens social comments. An empty Facebook app ID keeps its external comment plugin disabled. The visitor's selected network is remembered; a recognized social referrer is used as a fallback. Browser login sessions on other domains cannot be inspected.

**Social feeds** stores approved Instagram post URLs, uploaded thumbnails, dates and hashtags. Choose Studio, GT, a person or a project; only published posts for that entity appear, newest first, within its configured cap. This curated feed works without an API token. Automatic Instagram synchronization requires a separately authorized provider; it is not enabled or represented as a live account connection.

**Reviews** stores project-specific reviews with moderation. Anonymous reviews require consent and cannot set their own approval status. Only approved reviews are public; origin URLs and consent are readable by staff only. Local website reviews are not automatically posted to VK/Facebook. Once configured, the optional provider widgets handle their own sign-in and comments. Live provider behavior requires a registered domain/app and provider acceptance testing.

Project and blog sharing use stable `/p/<code>` redirects. Existing blog entries receive short codes during migration. Facebook is `.1` and VK is `.2` under both `5.7` and `11.2`, matching the specification.

## Versioning and source control

Use the configured `origin`: `https://github.com/ewan-grayest/idp-web-site.git`. Work is merged into `main`.

The version lives in `package.json` and shows in the site footer. Commits don't need a version change: bump it only when deploying a release (`npm run version:patch`, or `version:minor` / `version:major`), commit, then deploy as in [deploy/README.md](deploy/README.md).

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
- The admin carries no spec numbers anywhere: tabs, field labels and hints, so «Миссия», not «Миссия 3.1», and «Показывать в слайдере на главной», not «… (1.2 / 1.3)» (Ewan, 2026-11-05).
- «Создать» beside an admin list's title is a filled button with a plus, 44px tall on touch screens (Ewan, 2026-11-08). Payload's small grey pill looked like the «правда» tags in the table, so adding a project seemed impossible. The style is in `src/app/(payload)/custom.css`.
- A database already migrated by the separate `master` branch is repaired on start (Ewan, 2026-11-08). Its migration dropped `projects.home_show_name` and renamed the kind `archive` to `product`, so here the «Проекты» list stayed blank and project pages answered 500. `20261108_083000_restore_projects_after_master` brings the column back and renames `product` to `archive`. On any other database it does nothing.
- The site must start on any Docker host (Ewan, 2026-11-05), so one image takes all its settings at start, including `NEXT_PUBLIC_*`, which are no longer build arguments. Hosts that keep no files between deploys stay unsupported, because uploads live on disk and foreign storage services are avoided.
