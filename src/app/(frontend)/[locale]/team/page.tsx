import { permanentRedirect } from 'next/navigation'
import { localePath } from '@/i18n/locales'
import { getLocale } from '@/i18n/server'

/** Compatibility permalink for the team index; individual people remain at /team/[slug]. */
export default async function TeamIndex() {
  permanentRedirect(localePath(await getLocale(), '/studio#team'))
}
