/**
 * Stable permalinks for the 17 page roles in the technical specification.
 * Keys are the spec page numbers, so code can always be traced back to a slide.
 * Paths are the Russian (default) addresses; other languages add a prefix (see i18n/locales).
 * Titles live in the dictionaries under `pages`.
 */
export const pages = {
  1: { path: '/', header: false },
  2: { path: '/promo', header: false },
  3: { path: '/studio', header: true },
  4: { path: '/team', header: true }, // /team/[slug]
  5: { path: '/projects/residential', header: true }, // /[slug]
  6: { path: '/partners', header: true },
  7: { path: '/projects/residential', header: true },
  8: { path: '/projects/public', header: true }, // /[slug]
  9: { path: '/projects/public', header: true },
  10: { path: '/press', header: true },
  11: { path: '/journal', header: true },
  12: { path: '/payment', header: true }, // ASSUMPTION: header kept
  13: { path: '/careers', header: true },
  14: { path: '/legal', header: true },
  15: { path: '/media', header: true }, // ASSUMPTION: header kept
  16: { path: '/projects/archive', header: true }, // /[slug]
  17: { path: '/projects/archive', header: true },
} as const

export type PageId = keyof typeof pages

/** Project kinds map to the detail page (5, 8, 16) and collection page (7, 9, 17). */
export const projectKinds = {
  residential: { detail: 5, collection: 7 },
  public: { detail: 8, collection: 9 },
  archive: { detail: 16, collection: 17 },
} as const

export type ProjectKind = keyof typeof projectKinds

export const projectPath = (kind: ProjectKind, slug: string) =>
  `${pages[projectKinds[kind].collection].path}/${slug}`

export const personPath = (slug: string) => `${pages[4].path}/${slug}`

/** Header 0.1 is hidden on Home (1) and Promo (2). */
export function headerVisible(pathname: string): boolean {
  return pathname !== pages[1].path && !pathname.startsWith(pages[2].path)
}

/** Header title 0.1.2: the page role the visitor is in (longest path match wins); its title is in the dictionary. */
export function sectionPage(pathname: string): PageId | null {
  let best: { len: number; id: PageId | null } = { len: -1, id: null }
  for (const [id, p] of Object.entries(pages)) {
    if (p.path === '/') continue
    if ((pathname === p.path || pathname.startsWith(p.path + '/')) && p.path.length > best.len) {
      best = { len: p.path.length, id: Number(id) as PageId }
    }
  }
  return best.id
}
