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

/** Request header set by src/proxy.ts: the page address without its language prefix. */
export const PATH_HEADER = 'x-idp-path'
