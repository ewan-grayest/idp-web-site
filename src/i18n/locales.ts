/**
 * Site languages. Russian is the default and keeps clean addresses (/studio);
 * the others get a prefix (/en/studio, /zh/studio). Adding a language: add its code here,
 * a dictionary in ./dictionaries and its admin language in payload.config.ts.
 */
export const locales = ['ru', 'en', 'zh'] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'ru'

/** Each language in its own name, for the switcher. */
export const localeNames: Record<Locale, string> = { ru: 'Русский', en: 'English', zh: '中文' }

/** Short labels for the header button. */
export const localeCodes: Record<Locale, string> = { ru: 'RU', en: 'EN', zh: '中' }

export const isLocale = (v: string | null | undefined): v is Locale => !!v && (locales as readonly string[]).includes(v)

/** Paths that never get a language prefix: the admin, the API, Next.js files. */
const unlocalized = /^\/(api|admin|_next)(\/|$|\?|#)/

/**
 * "/studio#team" in English → "/en/studio#team". Russian, hash-only, external,
 * admin and API links come back unchanged.
 */
export function localePath(locale: Locale, path: string): string {
  if (locale === defaultLocale || !path.startsWith('/') || path.startsWith('//') || unlocalized.test(path)) return path
  return path === '/' || path[1] === '?' || path[1] === '#' ? `/${locale}${path.slice(1)}` : `/${locale}${path}`
}

/** "/en/studio" → { locale: 'en', path: '/studio' }; "/studio" → { locale: 'ru', path: '/studio' }. */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const seg = pathname.split('/')[1]
  if (!isLocale(seg)) return { locale: defaultLocale, path: pathname || '/' }
  return { locale: seg, path: pathname.slice(seg.length + 1) || '/' }
}

/** Cookie with the language the visitor picked themselves; it beats the browser's languages. */
export const CHOICE_COOKIE = 'idp-locale'

/**
 * The site language for a browser's Accept-Language (Ewan, 2026-10-26): the visitor's most preferred of
 * Russian, Chinese and English, in their own order. English when none of them is listed, and also when the
 * browser names no language at all (Ewan, 2026-11-12; until then that kept Russian).
 */
export function browserLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage?.trim()) return 'en'
  const ranked = acceptLanguage
    .split(',')
    .map((part, i) => {
      const [tag, ...params] = part.trim().toLowerCase().split(';')
      const q = params.map((x) => x.trim()).find((x) => x.startsWith('q='))
      return { lang: tag.split('-')[0], q: q ? Number(q.slice(2)) || 0 : 1, i }
    })
    .filter((x) => x.lang && x.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i)
  return ranked.map((x) => x.lang).find(isLocale) ?? 'en'
}

/** Request header set by src/proxy.ts: the page address without its language prefix. */
export const PATH_HEADER = 'x-idp-path'
