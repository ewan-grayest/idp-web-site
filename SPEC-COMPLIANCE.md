# ID Project · specification compliance

Source: `../technical specifications.pptx` (five slides). The current user brief governs requirements; subsequent instruction makes VK configurable and disabled by default. Internal notes in the old README are historical decisions, not overrides of this brief.

## Page roles and component map

| Spec role / elements | Stable route | Implementation |
| --- | --- | --- |
| 0.1.1–0.1.14 · fixed contextual header, phone, consented enquiry, site search | All content pages | `src/components/shell/Header.tsx`; the logo opens the supplemental site menu, whose first link is Home (Ewan, 2026-11-11) |
| 0.2 / 0.3.1–0.3.8 · content / full footer navigation | All content pages | `SiteChrome.tsx`, `Footer.tsx`, `src/lib/site.ts`; Archive included; ID Lab inactive |
| 1 / 1.1 / 1.2 / 1.3 / 1.2.1 / 1.3.1 | `/` | `HomeSliders.tsx`; opposing 50/50 project sliders, pause/expand on hover, logo +20%, swipe, progress, reduced-motion support |
| 2 / 2.1–2.3 | `/promo` | `PromoVideo.tsx`; fullscreen film, playback/sound, Escape/close, team link; CMS upload and behavior options |
| 3.1–3.8 | `/studio` | Mission/vision, horizontal expandable `TeamStrip`, newest-left `Timeline`, horizontal `Journal`, selectable map, enquiry, partner logos, capped feed |
| 4.1.1–4.1.5 / 4.2 / 4.3 / 4.4 / 4.5 | `/team/[slug]` | Person photo, role, name, quote, interests, achievements, projects/tags, contextual enquiry, capped person feed |
| Team index alias | `/team` → `/studio#team` | Permanent redirect; no unfinished stand-in |
| 5 / 8 / 16; shared elements 5.1–5.12 | `/projects/{residential,public,archive}/[slug]` | One detail template: presentation strip, fullscreen galleries, partner hotspots/logos, author, tags/team, concept/preview/process, sharing/short URL, achievements, reviews, enquiry, recommendations, capped feed |
| 5.7-b / 5.7.5 · public-only price enquiry | `/projects/public/[slug]` | Context includes project title, entity and originating URL |
| 7 / 9 / 17; shared elements 7.1–7.3 | `/projects/{residential,public,archive}` | One collection template; draft selections apply explicitly; server and UI use the same configurable cap; selected tags persist in URL |
| 6.1–6.7 · Get-Together partners | `/partners#partner-slug` | Program copy, partner selector, description, benefits, enquiry, horizontal projects, linked tags, map, contacts, capped GT feed |
| 10.1–10.4 · press | `/press` | Horizontal article collection, source/date, green hover action, external original |
| 11.1.1–11.1.5 / 11.2.1–11.2.4 | `/journal#entry-slug` | Shared editorial template; newest-first vertical timeline, horizontal photos, text, selected-entry sharing and short URL |
| 12.1 / 12.2 | `/payment` | CMS payment information, return action; no checkout |
| 13.1 | `/careers#entry-slug` | Shared editorial template; vacancies as content; no application form |
| 14.1 | `/legal#document-slug` | Company details and legal documents in shared editorial template |
| 15.1 / 15.2 | `/media` | CMS media/PR text and return action |
| Short URLs | `/p/[code]` | Permanent redirects to project or editorial permalinks; immutable existing codes |
| Site map | `/sitemap.xml` | Generated public page/entity URLs and language alternates |

Paths in the table are Russian default addresses. English adds `/en`, Chinese `/zh`. Localized content falls back to Russian. The same page role and component IDs apply in every language.

## Traceability

Open any frontend URL with `?ids=1`. The review-only inspector lists every rendered `data-spec` ID, occurrence counts and a control to locate the element. Existing inline badges remain available. Inspect the DOM to identify each instance, including repeated collection cards and timeline events.

The project detail variants use page 5 component IDs because the attachment explicitly shares that template between pages 5, 8 and 16. The outer article identifies the actual role. Collection variants do the same with reference IDs from page 7. Timeline sub-elements are generated from their corresponding 3.3 / 4.2 / 5.8 prefixes. Blog sharing uses 11.2 rather than 5.7.

## Configurable behavior

| Setting | Default | CMS location |
| --- | --- | --- |
| Selected tags | 5 | Site settings → Limits |
| Studio feed | 12 | Site settings → Limits |
| Person feed | 12 | Site settings → Limits |
| GT feed | 12 | Site settings → Limits |
| Project feed | 3 | Site settings → Limits |
| Latest project reviews | 5 | Site settings → Limits |
| Hashtag | Unfiltered | Studio/GT in Site settings; Person/Project on entity |
| Map provider | Yandex | Fixed: Google Maps removed for 152-ФЗ (data localization); loads after the visitor's consent |
| Coordinates / zoom | Studio coordinates | Studio → Contacts |
| VK integration | **Disabled** | Site settings → Enable VK integration / public app ID |
| Facebook comment widget | **Removed** (152-ФЗ cross-border transfer; Meta banned in Russia) | App ID field kept but unused |
| Feed / review display | Enabled | Site settings |
| Social network | VK fallback | Site settings; browser selection remembered |
| Promo film / first-visit intro / autoplay / sound | Existing CMS values | Studio → Promo video |
| Contacts and social profile links | Existing CMS values | Studio → Contacts |

Feed limits are applied after entity and exact hashtag filtering. Anonymous visitors cannot publish feed items or approve their own reviews. Lead records are staff-only; public reviews do not reveal origin URLs or consent records.

## Personal data (152-ФЗ)

Consent boxes (0.1.9, 5.9.3) start unticked every time; reviews also need a separate consent to publication. Each consent and each cookie choice is written to «Журнал согласий» with time, IP address, browser, page, wording and document versions; records are read-only and can be deleted only after a year. The Yandex map waits for consent; Google Maps and the Facebook comment widget are gone. Details and the organisational checklist: [PERSONAL-DATA.md](PERSONAL-DATA.md).

## Deliberate scope and limits

- Roboto is self-hosted; the three brand colors remain exact design tokens. Light/dark support uses a neutral gray palette.
- CMS-approved social posts render without an Instagram API connection. Automatic feed synchronization is not enabled. External post links open in a new tab.
- VK is optional and off by default. Enabling it requires a registered public site/app ID; its SDK is loaded only on the visitor's request. Live provider sign-in, permissions and cross-posting remain provider-managed and require acceptance testing on a registered domain. The site does not claim to detect private login sessions on other domains.
- Local reviews require consent and moderation. They are not automatically cross-posted to social networks.
- The attachment contains contradictory references (including a consent link to page 13, an archive link to page 14, and both Home halves described as public). Resolved using the explicit 17-role map and the linked target roles: Legal 14, Archive 16/17, public left / residential right.
- ID Lab remains TBD. E-commerce checkout, job application forms and reward accounting are excluded.
- Content remains editable in the existing CMS. No sample projects, feed items or enquiries from QA are added to the running site's database. Missing studio-approved content remains an editorial task.

## Validation

- TypeScript and unit tests pass, including tag URL boundaries and the consent log rules.
- Production Next.js build passes with all frontend, admin, API, short-link and sitemap routes.
- The additive migration passed upgrade, rollback and re-upgrade on an isolated copy of the existing database.
- `scripts/verify-spec.ts` passes eight integration groups: every page role and language, shell/logo behavior, default caps, latest reviews/VK off, custom caps/no Google Maps/tag URLs, moderation/privacy with both review consents logged, context-aware leads with their consent record, and sitemap/404/short redirects.
- Browser verification covers the narrow responsive studio layout, contextual public-project price enquiry and fullscreen image viewer. Provider sign-in is intentionally not exercised while VK is disabled.

Admin sidebar names and editing tabs omit specification numbers in Russian, English and Chinese. Technical IDs remain in source comments, `data-spec` and this map.

## Version policy

The project is versioned in `package.json` and `package-lock.json`; the footer displays the version. It is bumped only when deploying a release (`npm run version:patch`, or minor/major); individual commits need no version change. Source remote: `https://github.com/ewan-grayest/idp-web-site.git`.
