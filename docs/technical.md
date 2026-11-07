# Technical specification

Describes the system as built. Last checked against the code on 2026-11-03. For running the site see the [README](../README.md); for backups see [BACKUP.md](../BACKUP.md).

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 16.4 (App Router, standalone output), React 19, TypeScript 7 |
| CMS | Payload 3.92, in the same app; Lexical rich text |
| Database | PostgreSQL 16 through `@payloadcms/db-postgres` |
| Images | `sharp`, `next/image` (AVIF, WebP); Payload sizes `thumb` 640, `wide` 1920, `panorama` 2880 |
| Styling | CSS Modules plus global tokens; no CSS framework |
| Motion | GSAP (lazy-loaded), CSS |
| Tests | Vitest, Playwright |
| Runtime | Node 22 on Alpine in Docker; Node ≥ 20.9 for development |

Declared but unused anywhere in `src`, `scripts` or `tests`: `embla-carousel-react`, `photoswipe`, `@fontsource/roboto`. Check before relying on them.

Next 16 differs from older versions; `AGENTS.md` requires reading `node_modules/next/dist/docs/` first. Relevant here: `src/proxy.ts` is the old middleware, and `next/root-params` provides the locale.

## Repository layout

```
src/
  app/(frontend)/[locale]/   site pages; [locale]/layout.tsx is a root layout
  app/(payload)/             admin, REST and GraphQL; has its own root layout
  collections/ globals/      Payload schema; labels.ts, localized.ts, preview.ts are helpers
  components/                admin collection home person project promo shared shell studio pages
  endpoints/                 /api/v1/backups, /api/v1/diagnostics
  instrumentation.ts         keeps recent log lines for the diagnostics page
  i18n/                      locales, dictionaries, Link, server and client helpers
  lib/                       data access and pure logic
  migrations/                committed Payload migrations
  styles/                    tokens.css, globals.css
  payload.config.ts          generated types: payload-types.ts
  proxy.ts                   language routing
scripts/                     content import, seed, backup and restore
tests/unit, tests/e2e
deploy/                      production compose, Caddy
```

Path aliases: `@/*` → `src/*`, `@payload-config` → `src/payload.config.ts`.

## Routing

`src/proxy.ts` runs on everything except `admin`, `api`, `_next` and paths with a file extension.

| Request | Result |
|---|---|
| `/ru/...` | 308 to the unprefixed address |
| `/en/...`, `/zh/...` | Passes through, sets `x-idp-path` |
| `/...`, visitor wants another language | GET only: 307 to `/en/...` or `/zh/...` |
| `/...` otherwise | Rewrite to `/ru/...`, address unchanged, sets `x-idp-path` |

"Wants" means the `idp-locale` cookie if set, otherwise `browserLocale(Accept-Language)`: the visitor's most preferred of ru, en, zh; English if none is listed; Russian if there is no header, as with search engines. Unprefixed responses send `Vary: Accept-Language, Cookie`.

Page routes are under `src/app/(frontend)/[locale]/`:

| Route | File |
|---|---|
| Home, Promo | `page.tsx`, `promo/` |
| Studio | `studio/` (`?project=<slug>` and `?tag=<slug>` narrow the team strip) |
| Person | `team/[slug]/` |
| Projects list, detail | `projects/[kind]/`, `projects/[kind]/[slug]/` |
| Short link | `p/[code]/`: permanent redirect to the project, keeps the language |
| Partners, Press, Payment, Media | `partners/`, `press/`, `payment/`, `media/` |
| Lifestyle, Careers, Legal | `journal/`, `careers/`, `legal/` |
| Stand-in | `[...slug]/`: any address under a known page path with no route of its own (bare `/team`, also `/press/x`) shows "in progress"; anything else is a 404 |

`src/lib/routes.ts` is the single source for page numbers and paths. Project kinds: `residential`, `public`, `archive`. Use `projectPath()` and `personPath()` instead of building strings.

Rendering: content pages use `force-dynamic`. There is no CDN or data cache layer. `React.cache` deduplicates within a request (`getContacts`).

## Data model

Collections, in admin menu order (`payload.config.ts`):

| Slug | Purpose | Key fields | Read access |
|---|---|---|---|
| `projects` | Pages 5/8/16 | `title`, `slug`, `kind`, `cover`, `onHome`, `homeOrder`, `homeShowName`, `tags`, `gallery[]` with hotspots, `leadAuthor`, `leadRole`, `summary`, `quote`, `authors`, `concept`/`preview`/`process`, `achievements[]`, `nextStage`, `shortCode` | Public |
| `people` | Team strip 3.2, page 4 | `name`, `slug`, `role`, `portrait`, `photo`, `quote`, `interests`, `tags`, `achievements[]`, `onTeam`, `order` | Public |
| `tags` | Shared by projects, people, partners | `title`, `slug` | Public |
| `partners` | Page 6, hotspots | `name`, `slug`, `logo`, `text`, `link`, `photo`, `discount`, `projects`, `tags`, `order` | Public |
| `issues` | Journal 3.4 | `title`, `number`, `date`, `cover`, `link` | Public |
| `press` | Page 10 | `title`, `source`, `date`, `url`, `photo`, `project` | Public |
| `lifestyle`, `careers`, `legal` | Pages 11, 13, 14; one factory in `entries.ts` | `title`, `slug` (`a-z0-9-`), `date`, `images`, `text` | Public |
| `leads` | Enquiries | `email`, `consent`, `originUrl`, `context`, `entity{type,ref}`, `locale`, `status` | Signed-in; **public create** |
| `media` | Uploads: images, MP4, WebM | `alt`, sizes | Public |
| `users` | Admin accounts | `email`, `name` | Payload auth default |

Globals, both publicly readable:

- `studio`: promo video and its switches `introOnFirstVisit`, `promoAutoplay`, `promoSound`; `mission`, `vision`; `history[]`; `address`, `lat`, `lng`, `zoom`; `phone`, `email`, `partnersPhone`, `partnersEmail`, `social`; `company`, `inn`, `kpp`, `ogrn`, `legalAddress`, `bank`.
- `page-texts`: `gt`, `payment`, `media`, all rich text.

Behaviour to preserve:

- `Project.shortCode` is set once in `beforeChange` and must never change: shared links depend on it.
- Hotspots have no required fields, so an unfinished one never blocks saving. One shows once it has coordinates and a name or partner (`toPhotos`).
- `leads.consent` must be true on the server. Visitors cannot set `status`.
- Slugs on `lifestyle`, `careers` and `legal` are validated; the others are only `required` and `unique`.
- Empty contacts fall back to `src/lib/site.ts` (`getContacts`). The phone falls back through admin, then `NEXT_PUBLIC_STUDIO_PHONE`, then the constant.
- Home slides fall back to numbered placeholders if no projects are ticked or the query fails (`getHomeSlides`).

## Data access

Server components call helpers in `src/lib/` (`projects`, `pages`, `person`, `studio`, `homeSlides`), which use `getPayload({ config })` and the page's locale. Relations are read at `depth: 1` or more and narrowed with type guards, since Payload returns `number | Doc`.

On the public site, client code reaches the API in only two places: header search and `sendLead`.

## Languages

`locales = ['ru', 'en', 'zh']`, default `ru` (`src/i18n/locales.ts`).

- **Interface text**: `src/i18n/dictionaries/`. `ru.ts` defines the `Dictionary` type, so missing keys fail `npm run lint`, and `tests/unit/locales.test.ts` checks them too. All dictionaries are bundled together. `zh` is a draft needing native review.
- **Content**: Payload `localized` fields with `fallback: true`, so untranslated text shows in Russian.
- **Admin interface**: ru, en, zh, independent of the content language.
- **Metadata**: `layout.tsx` emits canonical and `hreflang` alternates per locale from `x-idp-path`.

To add a language: its code in `locales.ts`, a dictionary, the admin language and name in `payload.config.ts`, then `npx payload migrate:create`. Arabic would also need a right-to-left layout pass.

## Client state

| Name | Kind | Purpose |
|---|---|---|
| `idp-theme` | localStorage | Chosen theme |
| `idp.consent` | localStorage | Consent box remembered |
| `idp-locale` | Cookie, 1 year | Language the visitor picked |
| `idp-intro-session` | Session cookie | Promo video already played |

Window events: `idp:theme` (theme changed), `idp:enquire` (open the enquiry form). Query flags: `?ids=1` (spec badges), `/?intro` (replay video), `?tags=a,b` (project filter).

## API

Base `/api/v1`, chosen so a client area can be added later without breaking URLs. Payload provides REST and `/api/v1/graphql` for every collection and global.

- **`POST /api/v1/leads`**: the public enquiry endpoint. Body: `email`, `consent`, `originUrl`, optional `context`, `entity`, `locale`. No rate limiting or captcha.
- **`/api/v1/backups`**: signed-in admins only (`guarded` in `src/endpoints/backups.ts`). Long tasks run in the background and the page polls for their steps.
- **`GET /api/v1/diagnostics`**: signed-in admins only. Settings with secrets blanked out, live checks and the kept log lines (`src/endpoints/diagnostics.ts`).

Search (`Header.tsx`) queries `projects.title` and `people.name` through REST with `like`, in the visitor's language and Russian. It does not cover partners, articles or entries.

## Admin

`/admin` is Payload with custom components, registered by path in `payload.config.ts` and in `src/app/(payload)/admin/importMap.js`, which `npm run generate:importmap` regenerates:

- `AdminActions`: "Open site" and "Log out" in the top bar.
- `LanguageSwitch`, `AdminGuide`: login page and dashboard language help.
- `HotspotPicker`: click and drag products on a photo.
- `MaintenanceNav`: the «Обслуживание» menu group with «Резервные копии» and «Диагностика».
- `backups/*`: the `/admin/backups` view.
- `diagnostics/*`: the `/admin/diagnostics` view: server facts, live checks (database and its version, pending migrations, upload and backup folders writable with free space, `pg_dump`, age of the latest backup), every setting the site reads with what is missing or wrong (`lib/diagnostics.ts`, pure), and the latest log lines. «Скопировать отчёт» puts it all in one text, secrets hidden, for the developer.

**Log lines** are kept in memory, up to 500 since the last start (`lib/logBuffer.ts`): `instrumentation.ts` copies `console` into it, and Payload's logger is configured with a Pino `logMethod` hook that does the same while still writing Payload's usual readable output. `PAYLOAD_SECRET`, the database password and any password in an address are replaced by `***` before a line is kept. Older lines, and anything printed before Node starts (`entrypoint.sh`), are only in the host's log.

Field labels name the page and component ID, so editors and the spec line up. `tests/unit/adminLabels.test.ts` constrains them. «Предпросмотр» opens the live page in the content language being edited (`collections/preview.ts`).

## Backups

Full database and media backups, as one `.tar` format shared by the admin page and `scripts/`, with checksums, a verifying test restore, and rotation (`KEEP_LAST` 14, `KEEP_MONTHLY` 6). A lock file `backups/.lock` serialises them. Details in [BACKUP.md](../BACKUP.md).

## Environment

| Variable | Used by | Notes |
|---|---|---|
| `DATABASE_URI` | App | Required. `entrypoint.sh` also accepts `DATABASE_URL`, which many hosts set |
| `PAYLOAD_SECRET` | App | Required |
| `NEXT_PUBLIC_SITE_URL` | App | Absolute links, metadata base. Read at run time through `lib/hosting.ts` |
| `NEXT_PUBLIC_STUDIO_PHONE` | App | Phone fallback. Read at run time |
| `NEXT_PUBLIC_PROMO_VIDEO_URL` | App | Used when no video is uploaded. Read at run time |
| `MEDIA_DIR` | App, compose | Upload folder. Empty: `./media` in dev, a Docker volume in compose, `/app/media` in the image alone |
| `PGDATA_DIR` | Compose | Database folder; empty folder on first use |
| `BACKUPS_DIR`, `BACKUP_MODE`, `KEEP_LAST`, `KEEP_MONTHLY`, `PG_BIN_DIR`, `BACKUPS_HOST_LABEL` | Backups | See `lib/backups.ts` |
| `SITE_DOMAIN`, `POSTGRES_PASSWORD`, `APP_BIND` | `deploy/` | Production only |
| `CONTENT_DIR` | Import scripts | Path to `content-source` |
| `BASE_URL`, `PW_CHROMIUM`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` | Playwright | Optional |

No setting is baked into the image: `src/lib/hosting.ts` looks up the `NEXT_PUBLIC_*` names through a variable, which `next build` does not inline. Write `process.env.NEXT_PUBLIC_X` literally and it freezes at build time.

## Deployment

**Local**: `./start.sh` runs `docker-compose.yml`, with `app` and `db`. Postgres binds to `127.0.0.1`; the app binds to `0.0.0.0:3000`.

**Image**: three stages in the `Dockerfile`: build with Node, copy PostgreSQL 16 client tools for backups, run standalone. `entrypoint.sh` stops early if a required setting is empty, forces `HOSTNAME=0.0.0.0`, starts as root only to hand `/app/media` and others to the `app` user, then drops privileges. It also runs as an arbitrary non-root user. `GET /api/health` backs the image's `HEALTHCHECK`. `scripts/check-image.sh` builds the image and tests these cases against a throwaway database.

**Production**: `deploy/docker-compose.prod.yml` is one VM with app, Postgres and Caddy for HTTPS. `deploy/docker-compose.behind-proxy.yml` is the same without Caddy, for hosts with their own proxy; keep the two in step. Required settings and troubleshooting: "Server hosting" in the README. `deploy/Caddyfile` sends `X-Robots-Tag: noindex`; delete that line to go public.

## Schema changes

1. Edit the collection or global. Development pushes the schema automatically.
2. `npm run generate:types`.
3. `npx payload migrate:create <name>`.
4. Commit the `.ts`, `.json` and updated `src/migrations/index.ts` with `payload-types.ts`.

Production applies `prodMigrations` on start. The backup restore also checks that the code is new enough for the backup.

## Testing

**Unit** (`tests/unit`, node environment): routes, locales, leads, short codes, admin labels, hosting settings, the diagnostics settings check and log buffer.

**End to end** (`tests/e2e`): needs the database; starts `npm run dev` unless `BASE_URL` is set. The browser locale is `ru-RU`, otherwise the proxy would redirect to `/en`. `global-setup.ts` creates one admin per Playwright project, because Payload keeps sessions on the user row and concurrent logins as one user would drop each other.

| Project | Runs |
|---|---|
| `desktop` (1440×900), `phone` (Pixel 7) | All specs except below |
| `intro-options`, `home-name` | Only their own spec, after the two above, because they change site-wide settings |

**Before finishing a change**: `npm run lint`, `npm test`, the related e2e spec, and `npm run build` if it touches routes, config or schema.

## Scripts

Run TypeScript ones with `npx payload run <file>`. All import scripts are additive and safe to re-run.

| Script | Does |
|---|---|
| `scripts/seed.ts` | Sample content marked `[Пример]`, with grey photos |
| `scripts/fill-pages.ts` | Legal drafts (`legal-drafts.ts`) and press articles |
| `scripts/import-studio.ts` | Real studio content from `../content-source` |
| `scripts/import-archive.ts`, `run-archive-import.sh` | Archived id-proekt.com and get-together.ru content |
| `scripts/backup.sh`, `restore.sh`, `verify-backup.sh`, `schedule-backup.sh` | See BACKUP.md |
| `scripts/check-image.sh` | Builds the image and checks it starts the way hosts run it. Needs Docker |

## Known gaps

- `POST /leads` has no rate limiting or spam protection, and leads send no notification; staff read them in the admin.
- Placeholders in `lib/site.ts`: Facebook URL, ID Lab address. The map point and legal drafts need checking.

### README statements that no longer match the code

Trust the code. Fix these in the README when convenient.

- "No automatic redirect by browser language": `src/proxy.ts` does redirect, since Ewan's 2026-10-26 decision.
- "the header's last button opens every section": the header logo button opens the site menu.
