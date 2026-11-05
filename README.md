# ID project website

Next.js 16 + Payload CMS 3 + PostgreSQL, one app and one Docker image.
Stack decisions: "Tools and tech stack" doc. Design: "IDP Site design" canvas.

## What's built (slice 1)

| Spec | Where |
|---|---|
| Design tokens (slide 0, design system v0.1) | `src/styles/tokens.css` |
| 17 page roles and permalinks | `src/lib/routes.ts` |
| 0.1 Header: logo, section title, phone, enquiry + consent, search | `src/components/shell/Header.tsx` |
| 0.3 Footer | `src/components/shell/Footer.tsx`, links in `src/lib/site.ts` |
| 1 Home: opposing sliders 1.2/1.3 of the projects ticked for Home (name unless switched off per project, «Смотреть проект», ‹ ›, one progress segment per project, «Пауза» on hover, swipe on phones), floating logo 1.1 (opens the Team page); the promo video plays over Home on a visitor's first visit (`/?intro` replays it) | `src/components/home/HomeSliders.tsx`, `src/app/(frontend)/[locale]/page.tsx` |
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
| CMS admin, in Russian, English or Chinese; "Open site" and "Log out" always in its top bar; side menu grouped as projects and team / site pages (each named with its page number) / enquiries, files, access; contacts, social links and company details in Студия | `/admin`, `src/components/admin/`, `groups` in `src/collections/labels.ts` |

All 17 page roles are built; `/team` alone still shows the "in progress" stand-in.
Legal drafts and the press articles found online load with `npx payload run scripts/fill-pages.ts` (safe to re-run).
Every component carries its spec ID in a `data-spec` attribute; add `?ids=1` to any URL to see them as badges.

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

Not in use: the site runs locally for now. `deploy/` holds a ready setup for one server (site, database, HTTPS) for later.

## Open assumptions

- Header is shown on text pages 12 and 15 (spec wireframe omits it).
- Header and footer are hidden on Home and Promo; the footer appears on every other page.
- Navigation: the spec has no menu, only the footer. The site menu lists the main sections in large type (Studio, Team, residential and public projects, Partners) and the rest smaller. Archive projects (16/17) are left out of the menu and footer (Ewan, 2026-10-26); `/projects/archive` still opens. On phones the theme switch moved from the header into the menu.
- Home sliders (Ewan found them vague, 2026-10-25): each slide shows its project's name and «Смотреть проект» and opens it; ‹ › and one segment per project sit beside the time indicator 1.2.1/1.3.1, «Пауза» shows while a half is pointed at, and the other side's name waits at the far edge of an open half. Autoplay moves toward the logo as the spec says; ‹ › and swipes move like any carousel (next comes in from the right). Reduced motion turns autoplay off.
- Media descriptions (alt) are optional (Ewan, 2026-10-25); an empty one falls back to the project's name.
- Logo 1.1 opens the Team page instead of the promo video (Ewan, 2026-10-25). The video plays by itself over Home once per browser session, so again on every new visit (session cookie `idp-intro-session`, Ewan 2026-10-25); it starts muted when the browser allows no sound before a click, with a sound button; closing it, Escape or its end shows Home. Visitors whose system asks for less motion get the play button instead. Afterwards the video stays at `/promo`. Since 2026-10-28 three admin switches in Студия → Промо-видео 2 (all on by default, Ewan) turn off the Home intro (`/?intro` still shows it), make the video wait for a click on the play button, or play it muted; the last two also apply at `/promo`.
- Footer link targets (`src/lib/site.ts`) are our reading of the spec; Instagram, VK, the phone and e-mail are the studio's real ones (from its Taplink and VK pages); Houzz points to the studio's Flatica profile (houzz.ru now redirects to Flatica); Facebook and the ID Lab address are still placeholders.
- Consent box is unticked by default, remembered in the browser once ticked, forgotten if unticked.
- 5.1 "up to 7" read as 7 frames visible at once; any number of frames scroll sideways.
- 5.11 cards: next stage of this project (set by hand), a similar project of the same kind (shared tag), and one of the other kind.
- "Team that worked on the project" (5.3.2) opens the Team page narrowed to that project's authors (`/studio?project=<slug>#team`); `?tag=<slug>` narrows it by tag.
- 3.2: nobody is open when the page loads; choosing a person opens 3.2-a, choosing them again or the cross closes it.
- 3.4: the date and number bar is always shown (touch screens have no hover) and turns green on hover; a click opens the enquiry "Получить экземпляр".
- 3.5.2: free Yandex map widget instead of a custom Google map (no key, no foreign billing). The map point is approximate until checked in the admin (Студия → Контакты).
- 3.5.3: address text is from the spec (postcode 119028); ул. Солянка is usually 109028, worth checking.
- 3.8 Instagram feed is not built (social feeds dropped).
- Search covers project titles and people's names, not yet partners, articles or entries.
- 6.7 Instagram feed is not built (social feeds dropped). Partner projects 6.4 are the ones picked in the partner plus those where it is tagged on a photo.
- 10: hovering an article shows a green «Читать статью» bar; the source and date sit on the photo (they would hide on touch screens otherwise).
- 14: the legal texts are drafts for a lawyer to check; Russian only, so English and Chinese show the Russian text until translated.
- Names over photos (Home, the strip 5.1, cards) sit on a dark fade with a halo around the letters (Ewan, 2026-10-26: hard to read on bright photos).
- Languages: Russian, English and Chinese until Ewan confirms the list. No automatic redirect by browser language: Russian stays at the clean address and visitors switch themselves. Arabic would need a right-to-left layout pass. Phones show the language list in the footer (no room for a fifth header button).
- An enquiry records the site language it was sent from (Leads → "Язык сайта").
- 4.1.1 uses a separate wide photo when there is one, otherwise the strip portrait. 4.3 lists projects the person led or worked on, newest first; 4.3.3 shows those projects' tags plus the person's own.
- 4.5 Instagram feed is not built (social feeds dropped).
- 7.1: the tag buttons are the tags used by projects of that kind, alphabetical. A click picks a tag, a double click (or a second click, for keyboard users) puts it back; a sixth tag can't be picked. The grid changes only on «Выбрать», and the choice goes into the address, so a filtered list can be shared; tags on a project page (5.3.1) open it the same way.
- 7.2: projects shown are those carrying all picked tags (each tag narrows the list), newest first, all on one page (no "load more" until there are many). Cards use the cover photo, or the first strip photo; touch screens show the name on a dark fade instead of the hover veil.
