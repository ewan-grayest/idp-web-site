'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

import { useI18n } from '@/i18n/client'
import { splitLocale } from '@/i18n/locales'
import type { Contacts } from '@/lib/pages'
import { headerVisible, sectionPage } from '@/lib/routes'
import { noteVisit } from '@/lib/visits'
import { Header } from './Header'
import { Footer } from './Footer'
import styles from './SiteChrome.module.css'

/**
 * Page frame, spec slide 0: header 0.1, content 0.2, footer 0.3.
 * Home (1) and Promo (2) are full-screen and get neither header nor footer.
 */
export function SiteChrome({ children, contacts }: { children: React.ReactNode; contacts: Contacts }) {
  const { t } = useI18n()
  const { path } = splitLocale(usePathname() || '/')
  // For «Вернуться» on pages 12 and 15
  useEffect(() => noteVisit(path), [path])

  if (!headerVisible(path)) return <>{children}</>

  const page = sectionPage(path)
  return (
    <>
      <Header title={page ? t.pages[page] : ''} phone={contacts.phone} email={contacts.email} />
      <main className={styles.main} data-spec="0.2">
        {children}
      </main>
      <Footer social={contacts.social} />
    </>
  )
}
