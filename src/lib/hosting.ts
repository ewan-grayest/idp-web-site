/**
 * Settings read when the site runs, not when the image is built, so one image runs on any host at any address.
 * Next.js freezes `process.env.NEXT_PUBLIC_X` at build time when it is written out, but leaves a lookup through
 * a variable alone (next/dist/docs/01-app/02-guides/environment-variables.md). The names keep their prefix so
 * existing settings files keep working. Server code only: the browser gets none of these.
 */
const setting = (name: string) => process.env[name]?.trim() || undefined

const LOCAL_SITE_URL = 'http://localhost:3000'

/** The site's origin without a trailing slash. Tolerates a missing scheme, and a bad value can't take every page down. */
export function normalizeSiteUrl(value?: string) {
  const raw = value?.trim()
  if (!raw) return LOCAL_SITE_URL
  try {
    return new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`).origin
  } catch {
    return LOCAL_SITE_URL
  }
}

export const siteUrl = () => normalizeSiteUrl(setting('NEXT_PUBLIC_SITE_URL'))
export const studioPhoneSetting = () => setting('NEXT_PUBLIC_STUDIO_PHONE')
export const promoVideoSetting = () => setting('NEXT_PUBLIC_PROMO_VIDEO_URL')

/**
 * The database address for pg_dump, pg_restore and psql; `db` swaps the database name.
 * A managed database with its own certificate needs `sslmode=no-verify` for the site's driver, but the PostgreSQL
 * tools reject that value and `uselibpqcompat`. For them `require` means the same: encrypted, certificate not checked.
 */
export function libpqUrl(uri: string, db?: string) {
  const url = new URL(uri)
  if (db) url.pathname = `/${db}`
  if (url.searchParams.get('sslmode') === 'no-verify') url.searchParams.set('sslmode', 'require')
  url.searchParams.delete('uselibpqcompat')
  return url.toString()
}
