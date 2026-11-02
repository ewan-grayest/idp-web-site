import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
// Self-hosted Roboto, including Cyrillic. No font CDN requests.
import '@fontsource/roboto/cyrillic-300.css'
import '@fontsource/roboto/cyrillic-400.css'
import '@fontsource/roboto/cyrillic-500.css'
import '@fontsource/roboto/cyrillic-600.css'
import '@fontsource/roboto/cyrillic-700.css'
import '@fontsource/roboto/cyrillic-300-italic.css'
import '@fontsource/roboto/latin-300.css'
import '@fontsource/roboto/latin-400.css'
import '@fontsource/roboto/latin-500.css'
import '@fontsource/roboto/latin-600.css'
import '@fontsource/roboto/latin-700.css'
import '@fontsource/roboto/latin-300-italic.css'
import '@/styles/globals.css'

import { SiteChrome } from '@/components/shell/SiteChrome'
import { SpecInspector } from '@/components/shared/SpecInspector'
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
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
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
          <SpecInspector />
        </I18nProvider>
      </body>
    </html>
  )
}
