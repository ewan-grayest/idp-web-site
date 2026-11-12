/**
 * Studio-wide defaults. Real contacts come from the studio's public Taplink and VK pages (2026-10-25).
 * The studio edits them in the admin (Студия → Контакты); these values fill in whatever is left empty there.
 */
/** Header 0.1.6 and Team page 3.5.3 (design projects), when the admin has none. */
export const studioPhone = '+7 (905) 588-94-88'
export const studioEmail = 'info@id-proekt.com'
/** Partnerships, Partners page 6.5. */
export const partnersPhone = '+7 (916) 212-26-46'
export const partnersEmail = 'sale@id-proekt.com'
/* Telegram https://t.me/IDPROJECT_INFO and VK messages vk.me/id_project_studio are not in the spec's footer. */

/** Footer 0.3.1–0.3.4. Labels are dictionary keys: footer.social.* */
/** Networks of Meta, banned in Russia as extremist: their names carry an asterisk and a note in the footer. */
export const metaNetworks: readonly string[] = ['instagram', 'facebook']
export const social = [
  { id: '0.3.1', key: 'instagram', href: 'https://www.instagram.com/id_project_/' },
  { id: '0.3.2', key: 'vk', href: 'https://vk.ru/id_project_design' },
  { id: '0.3.3', key: 'facebook', href: 'https://facebook.com/' }, // PLACEHOLDER: hidden behind a VK login
  { id: '0.3.4', key: 'houzz', href: 'https://flatica.ru/pro/id-project' }, // Houzz Russia became Flatica: houzz.ru redirects there
] as const

/**
 * Footer 0.3.5 link columns. Targets are our reading of the spec (see "footer mislinks" in the decision register).
 * Labels are dictionary keys: footer.columns.* and footer.links.*
 */
export const footerColumns = [
  {
    key: 'studio',
    links: [
      { key: 'mission', href: '/studio#mission' },
      { key: 'team', href: '/studio#team' },
      { key: 'history', href: '/studio#history' },
      { key: 'residential', href: '/projects/residential' },
      { key: 'public', href: '/projects/public' },
    ],
  },
  {
    key: 'press',
    links: [
      { key: 'press', href: '/press' },
      { key: 'journal', href: '/studio#journal' },
      { key: 'media', href: '/media' },
      { key: 'lifestyle', href: '/journal' },
    ],
  },
  {
    key: 'clients',
    links: [
      { key: 'contact', href: '/studio#contacts' },
      { key: 'payment', href: '/payment' },
      { key: 'careers', href: '/careers' },
      { key: 'partners', href: '/partners' },
    ],
  },
  {
    key: 'legal',
    links: [
      { key: 'terms', href: '/legal' },
      // 152-ФЗ, ч. 2 ст. 18.1: the personal data policy is reachable from every page
      { key: 'privacy', href: '/legal#privacy' },
      { key: 'copyright', href: '/legal#copyright' },
    ],
  },
] as const

/**
 * Site menu (not in the spec: Ewan asked for navigation on 2026-10-25, the spec only had the footer).
 * Main sections in large type, the rest smaller. Labels are dictionary keys: menu.*
 * Pages 16/17 (archive, now product design under ID Lab) are left out of the menu (Ewan, 2026-10-26); the footer's
 * ID Lab link 0.3.7 opens them (Ewan, 2026-11-05).
 */
export const menuMain = [
  { key: 'home', href: '/' },
  { key: 'studio', href: '/studio' },
  { key: 'team', href: '/studio#team' },
  { key: 'residential', href: '/projects/residential' },
  { key: 'public', href: '/projects/public' },
  { key: 'partners', href: '/partners' },
] as const

export const menuMore = [
  { key: 'promo', href: '/promo' },
  { key: 'journal', href: '/studio#journal' },
  { key: 'lifestyle', href: '/journal' },
  { key: 'press', href: '/press' },
  { key: 'media', href: '/media' },
  { key: 'payment', href: '/payment' },
  { key: 'careers', href: '/careers' },
  { key: 'legal', href: '/legal' },
  { key: 'contacts', href: '/studio#contacts' },
] as const

/** Footer 0.3.6–0.3.8 sister brands. */
export const sisterSites = [
  { id: '0.3.6', label: 'ID project', href: '/' },
  { id: '0.3.7', label: 'ID Lab', href: '/id-lab' }, // The studio's product design projects (Ewan, 2026-11-05)
  { id: '0.3.8', label: 'Get-Together', href: '/partners' },
]

/**
 * Set once the promo video has played over Home in this browser session; Home reads it on the server.
 * A session cookie (Ewan, 2026-10-25): the video plays again on every new visit, i.e. after the browser is reopened.
 * Renamed from 'idp-intro', a one-year cookie, so browsers that kept the old one see the video again.
 */
export const INTRO_COOKIE = 'idp-intro-session'
