'use client'

import { usePathname } from 'next/navigation'

import { useI18n } from '@/i18n/client'
import { localeCodes, localeNames, localePath, locales, splitLocale } from '@/i18n/locales'

/**
 * The same page in each site language. Used in the header, the footer and on Home.
 * A full page load, so the whole page (and <html lang>) switches together; query and #section are kept.
 */
export function LanguageLinks({ className, itemClassName, short }: { className?: string; itemClassName?: string; short?: boolean }) {
  const { locale, t } = useI18n()
  const { path } = splitLocale(usePathname() || '/')

  return (
    <nav className={className} aria-label={t.header.language} data-language-links>
      {locales.map((l) => (
        <a
          key={l}
          href={localePath(l, path)}
          hrefLang={l}
          lang={l}
          aria-current={l === locale ? 'true' : undefined}
          aria-label={short ? localeNames[l] : undefined}
          className={itemClassName}
          onClick={(e) => {
            e.preventDefault()
            window.location.assign(localePath(l, path + window.location.search + window.location.hash))
          }}
        >
          {short ? localeCodes[l] : localeNames[l]}
        </a>
      ))}
    </nav>
  )
}
