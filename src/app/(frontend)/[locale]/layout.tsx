import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
// Roboto, the spec's typeface (slide 1), self-hosted: no font CDN requests. Free under the SIL Open Font
// License 1.1, which allows commercial use and serving the files from our own site (Ewan, 2026-11-11).
// Variable font: one file per alphabet holds every weight from 100 to 900, so any weight in the CSS or
// bold/italic in admin rich text renders as drawn rather than faked by the browser. The browser fetches only
// the alphabets (Latin, Cyrillic, ...) and styles a page uses: 65 KB for a Russian page, about 60 KB more
// where an arrow or other symbol (such as «↗») needs Roboto's symbol files.
import '@fontsource-variable/roboto/wght.css'
import '@fontsource-variable/roboto/wght-italic.css'
import '@/styles/globals.css'

import { CookieNotice } from '@/components/shell/CookieNotice'
import { SiteChrome } from '@/components/shell/SiteChrome'
import { SpecInspector } from '@/components/shared/SpecInspector'
import { siteUrl } from '@/lib/hosting'
import { I18nProvider } from '@/i18n/client'
import { locales, localePath, PATH_HEADER } from '@/i18n/locales'
import { getLocale, getT } from '@/i18n/server'
import { getContacts } from '@/lib/pages'
import { themeScript } from '@/lib/theme'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = await getT()
  // The address without its language prefix, passed on by src/proxy.ts
  const path = (await headers()).get(PATH_HEADER) || '/'
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: 'ID project', template: '%s · ID project' },
    description: t.meta.description,
    // Search engines: this page's address in each language
    alternates: {
      canonical: localePath(locale, path),
      languages: { ...Object.fromEntries(locales.map((l) => [l, localePath(l, path)])), 'x-default': path },
    },
    openGraph: { locale },
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f7f7' },
    { media: '(prefers-color-scheme: dark)', color: '#161616' },
  ],
}

// ?ids=1 shows the spec's component IDs as green badges, for traceability review
const showIdsScript = `if(new URLSearchParams(location.search).has('ids'))document.documentElement.setAttribute('data-show-ids','')`

export default async function FrontendLayout({ children }: { children: React.ReactNode }) {
  const [locale, contacts] = await Promise.all([getLocale(), getContacts()])
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript + ';' + showIdsScript }} />
      </head>
      <body>
        <I18nProvider locale={locale}>
          <SiteChrome contacts={contacts}>{children}</SiteChrome>
          <CookieNotice />
          <SpecInspector />
        </I18nProvider>
      </body>
    </html>
  )
}
