'use client'

import { usePathname } from 'next/navigation'

import { useI18n } from '@/i18n/client'
import { CHOICE_COOKIE, localeCodes, localeNames, localePath, locales, splitLocale } from '@/i18n/locales'

import styles from './LanguageLinks.module.css'

/**
 * The same page in each site language. Used in the header, the footer and on Home.
 * A full page load, so the whole page (and <html lang>) switches together; query and #section are kept.
 * The pick is remembered for a year, so it beats the browser's language on the next visit (see src/proxy.ts).
 * `pill`: the compact RU · EN · 中 bar used on Home and at the foot of every other page.
 */
export function LanguageLinks({
  className,
  itemClassName,
  short,
  pill,
}: {
  className?: string
  itemClassName?: string
  short?: boolean
  pill?: boolean
}) {
  const { locale, t } = useI18n()
  const { path } = splitLocale(usePathname() || '/')

  return (
    <nav className={[pill && styles.pill, className].filter(Boolean).join(' ')} aria-label={t.header.language} data-language-links>
      {locales.map((l) => (
        <a
          key={l}
          href={localePath(l, path)}
          hrefLang={l}
          lang={l}
          aria-current={l === locale ? 'true' : undefined}
          aria-label={short || pill ? localeNames[l] : undefined}
          className={[pill && styles.item, itemClassName].filter(Boolean).join(' ')}
          onClick={(e) => {
            e.preventDefault()
            document.cookie = `${CHOICE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`
            window.location.assign(localePath(l, path + window.location.search + window.location.hash))
          }}
        >
          {short || pill ? localeCodes[l] : localeNames[l]}
        </a>
      ))}
    </nav>
  )
}
