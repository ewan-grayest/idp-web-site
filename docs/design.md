# Design specification

Describes the design as built. Last checked against the code on 2026-11-03.

## Sources, in order of precedence

1. **Owner decisions**: dated `(Ewan, YYYY-MM-DD)` in code comments and in the README's "Content and scope decisions".
2. **Design tokens v1.0**: `src/styles/tokens.css`. They replace most of the spec's colours and add the type sizes the spec leaves open; the typeface is the spec's Roboto.
3. **Technical specification**: `../technical specifications.pptx`, in the parent `IDP Site/` folder, not in this repo. It defines the page numbers and component IDs. Six slides, in Russian.

The README also names a "Tools and tech stack" doc and an "IDP Site design" canvas. Neither is in the repo, and the code and this file do not depend on them.

## Direction

Editorial and photo-led, for an interior design studio. Light theme: warm paper, ink text, light-weight Roboto display type. Dark theme: warm graphite, tuned to match. Photos are wide and bleed to the edges. The spec's green `#8dc63f` is the single accent. Corners are nearly square (`--radius: 2px`).

## Colour

Always use the variable. Contrast figures are from `tokens.css`.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--c-bg` | `#f5f2ec` | `#151412` | Page |
| `--c-surface` | `#ece7de` | `#1e1c1a` | Cards, header, forms |
| `--c-raised` | `#e4ded3` | `#282623` | Search panel, menus |
| `--c-line` | `#d9d4cb` | `#34312c` | Hairlines, timeline track |
| `--c-text` | `#1c1b19` (15.6:1) | `#e6e1d8` (14.9:1) | Primary text |
| `--c-text-2` | `#4a4843` (8.4:1) | `#bdb7ad` (9.6:1) | Secondary body |
| `--c-muted` | `#6d6a64` (4.8:1) | `#9c978e` (6.6:1) | Captions, meta |
| `--c-action` | `#6d6a64` | `#8a857c` (5.0:1) | Text actions at rest |
| `--c-accent-text` | `#46701a` (5.2:1) | `#8dc63f` (9.4:1) | Green used as text; focus ring |
| `--c-tag-bg` / `--c-tag-text` | `#ece7de` / `#1c1b19` | `#2a2825` / `#e6e1d8` | Tag chips at rest |
| `--c-photo-ph` | `#d8d0c3` | `#2c2a27` | Photo placeholder |

Same in both themes: `--c-accent` `#8dc63f` (dots, underlines, active tag, footer band), `--c-on-accent` `#1a1a1a` (text on green, 8.6:1), `--c-promo` `#0b0b0b` (promo video, photo viewer).

Over photos: `--scrim-top`, `--scrim-bottom` and `--on-photo-shadow`. A name on a photo always gets a dark fade and a halo, so it stays legible on bright images (Ewan, 2026-10-26).

## Themes

Order of decision:

1. `<html data-theme="light|dark">`, set from `localStorage['idp-theme']` by an inline script in `<head>` before first paint.
2. Otherwise `prefers-color-scheme`.

`src/lib/theme.ts` holds the logic. `applyTheme` fires the `idp:theme` window event so every switch stays in sync. A new dark value must be added in **two** places in `tokens.css`: the `[data-theme="dark"]` block and the `prefers-color-scheme` block.

Always dark, via `.theme-dark`: Home, Promo and the photo viewer.

## Type

Roboto throughout, as spec slide 1 asks, with body text at the spec's 10pt (13.333px). The fonts must be free and as in the spec (Ewan, 2026-11-11): Roboto is under the SIL Open Font License 1.1, which allows commercial use and serving it from our own site. Use no other typeface, and check the licence before adding one.

- Self-hosted through `@fontsource-variable/roboto`, imported in `src/app/(frontend)/[locale]/layout.tsx`: no font CDN. The variable font holds every weight from 100 to 900 and italics, so any weight, and bold or italic in admin rich text, renders as drawn. The browser downloads only the alphabets and styles a page uses.
- The stack is `--font-sans` in `tokens.css`; `--font` and `--font-serif` are the same stack, kept as names for headings. Component CSS uses these variables, never the name `Roboto`.
- Chinese: Roboto has no CJK glyphs, so the visitor's system font takes over (PingFang, Microsoft YaHei, Noto Sans CJK and similar). Nothing is downloaded for it.

| Token | Desktop | Phone (≤767px) |
|---|---|---|
| `--t-display` | 300, 64/68 | 44/48 |
| `--t-h1` | 300, 48/52 | 36/40 |
| `--t-h2` | 400, 34/40 | 28/34 |
| `--t-h3` | 600, 20/28 | same |
| `--t-lead` | 400, 18/30 | same |
| `--t-body` | 400, 13.333/22: the spec's 10pt | same |
| `--t-small` | 400, 13/20 | same |
| `--t-label` | 600, 12/16; caps, `.14em` tracking | same |
| `--t-title` | 400, 22/28; header section title 0.1.2 | 18/24 |
| `--t-quote` | italic 300, 26/34 | 21/28 |

Chinese (`:lang(zh)` in `globals.css`): no synthesised italics, no letter-spacing, strict line breaking. Long words wrap and hyphenate according to `<html lang>`.

## Layout and spacing

- **Spacing**, `--s-1` to `--s-10`: 4, 8, 16, 24, 32, 48, 64, 96, 128, 160. `--section-gap` is 160 / 128 tablet / 96 phone.
- **Content frame**, class `.content`: `--content-w` (`100% - 12vw`, phone `100% - 32px`), capped at `--content-max` 1320px. Photos bleed past it.
- **Header height**, `--header-h`: 84 / 72 tablet / 64 phone. The header is fixed. `section[id]` has a matching `scroll-margin-top`.
- **Other**: `--gutter` 24px, `--photo-gap` 6px between photos.

Breakpoints: phone 360–767, tablet 768–1279, desktop 1280–1919, wide 1920+. Write them as `max-width: 767px` and `max-width: 1279px`. Use `(hover: none)` for touch behaviour rather than width alone.

## Motion

| Token | Value | Use |
|---|---|---|
| `--d-hover` | 200ms | Hover colour |
| `--d-theme` | 300ms | Theme change |
| `--d-expand` | 500ms | Expanding panels |
| `--d-rise` | 800ms | Long entrances |
| `--ease-out` | `cubic-bezier(.2,.7,.2,1)` | General |
| `--ease-slide` | `cubic-bezier(.6,0,.2,1)` | Slides |

- **Section rise** (`components/shared/Rise.tsx`): each `section` after the first rises 64px on scroll, using lazily loaded GSAP ScrollTrigger. Direct children only.
- **Timeline dock** (`shared/useDock.ts`): dock-style magnification on desktop pointers.
- **Home**: 6-second autoplay toward the logo, in `HomeSliders.tsx`.
- **Reduced motion**: duration tokens go to 0 and `globals.css` flattens transitions. JS checks it too: no Rise, no Home autoplay, and the promo video shows a play button instead of starting.

## Shared components

**Header 0.1** (`shell/Header.tsx`). Fixed, on `--c-surface`, hairline below; hidden on Home and Promo.
- Logo 0.1.1: greyscale at rest, colour on hover. It opens the site menu, and there is no other menu button; the spec had it link Home (Ewan, 2026-11-11).
- Section title 0.1.2: the page title, replaced on scroll by the nearest section above the header line that has `data-header-title`.
- Then the icon buttons: call 0.1.3 (reveals phone 0.1.6), mail 0.1.4 (opens the email field 0.1.7 and consent 0.1.8–0.1.10, and becomes the send button), search 0.1.5 (opens the search form), theme. On phones the theme switch moves into the menu.

**Site menu** (`shell/SiteMenu.tsx`). Not in the spec; added 2026-10-25. Main sections in large type, the rest smaller, plus contacts, languages and theme. Lists: `menuMain` and `menuMore` in `lib/site.ts`. Pages 16/17 are deliberately left out: archive projects at first, product design under ID Lab since 2026-11-05, which the footer's ID Lab link 0.3.7 opens.

**Footer 0.3** (`shell/Footer.tsx`). Green band with `--c-on-accent` text; hover is an underline. Social row, link columns (`footerColumns`), sister brands, languages.

**Text action** (`shared/TextAction.module.css`). Caps at 14px with `.08em` tracking. `--c-mid` at rest; on hover, text colour with a 2px green underline. Used by `BackButton` («Вернуться»), `EnquireButton` and `TagFilter` («Выбрать»). The timeline's «Подробнее» repeats the same style in its own CSS.

**Timeline** (`shared/Timeline.tsx`). Horizontal, newest on the left, 16px dots, the selected dot filled green, a card below. Becomes a scrolling tab row on phones. Pages 11, 13 and 14 use a vertical variant in `pages/Entries.tsx`.

**Tag chip** (`collection/TagFilter.tsx`). `--c-tag-bg` at rest, green when picked, green inset ring on hover.

**Project card**. Photo with a green hover veil and the name; on touch screens the name sits on a dark fade instead. Hover scales the image to 1.03.

**Photo viewer** (`project/Viewer.tsx`). Full-screen, always dark, with shopping hotspots 5.1.3. Custom-built.

**Enquiry CTA** (`shared/EnquireButton.tsx`). Calls `openEnquiry()`, which opens the header's enquiry form with a context label and entity, so every lead records where it came from.

**Icon buttons**: 48px circles with a 1.5px outline. **Focus**: 2px `--c-accent-text` outline, 3px offset.

## Pages

Numbers are the spec's page roles, keyed in `src/lib/routes.ts`. Russian addresses shown; `/en` and `/zh` prefix them.

| # | Address | Page | Design notes |
|---|---|---|---|
| 1 | `/` | Home | Two 50/50 full-screen sliders (left public, right residential) with a floating logo. Pointing expands a half and pauses. Phones stack them. Always dark, no header or footer. |
| 2 | `/promo` | Promo video | Full-screen, always dark. Also plays over Home once per browser session. |
| 3 | `/studio` | Studio and team | Mission, team strip with an open card, history timeline, journal covers, map and address, partner tiles. |
| 4 | `/team/[slug]` | Person | Wide photo, role, name, quote, interests, achievements, projects, "ask me". Bare `/team` is still a stand-in. |
| 5, 8, 16 | `/projects/{residential,public}/[slug]`, `/id-lab/[slug]` | Project | Shared template: strip and viewer, author, tags, concept/preview/process stages, sharing and short link, achievements, CTAs, recommendations. Price CTA 5.7-b appears on public projects only (page 8). |
| 7, 9, 17 | `/projects/{residential,public}`, `/id-lab` | All projects of a kind; 17 is ID Lab, the product design projects (archive in the spec) | Tag filter (up to 5, applied by «Выбрать», kept in `?tags=a,b`) above a card grid. |
| 6 | `/partners` | Partners / Get-Together | Scheme text, logo buttons that pick a partner (`#slug`), map, contacts. |
| 10 | `/press` | Press | Sideways slider of wide photos with source and date; opens the article. |
| 11, 13, 14 | `/journal`, `/careers`, `/legal` | Entries | Vertical timeline, newest on top, beside the picked entry; `#slug` opens one. 11 adds sharing, 14 starts with company details. |
| 12, 15 | `/payment`, `/media` | Text | One admin-edited text and «Вернуться». |

Page frame: `SiteChrome` adds header, `main` and footer everywhere except Home and Promo.

## Decisions that override the spec

| Spec | As built | Decided |
|---|---|---|
| Header height from logo (15%) | Slim `--header-h` | Tokens v0.2 |
| `#6d6d6d`, `#d2d2d2` as literal colours | Their heirs `--c-muted`, `--c-line`, per theme | Tokens v1.0 |
| Grey text on green footer | Graphite (spec colour is 2.5:1) | Confirmed in `Footer.module.css` |
| One dark theme | Light and dark with a switch | Ewan, 2026-10-22 |
| Header logo goes Home | Logo opens the site menu; Home is its first entry | Site menu work, 2026-10-25; Ewan, 2026-11-11 |
| Home logo 1.1 opens promo | Opens Studio/Team; video plays by itself per session | Ewan, 2026-10-25 |
| Both sliders labelled "public interiors" | Left public, right residential | `lib/homeSlides.ts` |
| Consent box behaviour 0.1.9 | Unticked by default, remembered once ticked | Confirmed, `lib/leads.ts` |
| No navigation but the footer | Site menu | Ewan, 2026-10-25 |
| Instagram feeds 3.8, 4.5, 6.7 | Not built | README |
| Google map 3.5.2 | Free Yandex widget | README |

The full list is under "Content and scope decisions" in the README.

## Accessibility baseline

- Text meets at least 4.5:1, using the tokens above.
- Tap targets at least 44px. Hover-only content has a touch fallback.
- Visible `:focus-visible` on everything interactive. Icon-only controls have `aria-label`.
- Photo `alt` is optional in the admin and falls back to the project's name through `altOr` (Ewan, 2026-10-25).

## Known drift from this spec

Worth fixing when you touch these files; do not copy them.

- Many components still use the v0.1 aliases (`--c-ground`, `--c-light`, `--c-mid`, `--c-green`, `--c-soft`).
- 63 CSS `font:` declarations are hard-coded against 44 using `--t-*`.
- Some breakpoints are off-scale: `1023px`, `1024px` and `768px` in places.
- A few raw hex values remain in component CSS, mostly `#f5f2ec` on always-dark surfaces and over photos.
- `.content` is commented as "80% wide" in `globals.css`, but `--content-w` is about 88%.
- `Rise` hard-codes its 64px and 0.6s rather than reading tokens; `--d-rise` is 800ms.
