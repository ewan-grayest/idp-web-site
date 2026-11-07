'use client'

import { useEffect, useState } from 'react'

import { useI18n } from '@/i18n/client'
import { Link } from '@/i18n/Link'
import { COOKIE_SETTINGS_EVENT, LEGAL_LINKS, logCookieChoice, readCookieChoice, saveCookieChoice, type CookieChoice } from '@/lib/privacy'
import styles from './CookieNotice.module.css'

/**
 * Cookie notice (152-ФЗ; Roskomnadzor treats cookies and IP addresses as personal data).
 * Shown until the visitor chooses; footer «Настройки cookie» opens it again. «Принять все» lets third-party
 * services load (Yandex Maps, VK comments), «Только необходимые» keeps to the site's own cookies and storage.
 * The choice is kept in the browser for a year and written to «Журнал согласий» on the server.
 */
export function CookieNotice() {
  const { t, locale } = useI18n()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(readCookieChoice() === null)
    const reopen = () => setOpen(true)
    window.addEventListener(COOKIE_SETTINGS_EVENT, reopen)
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, reopen)
  }, [])

  if (!open) return null

  const choose = (choice: CookieChoice) => {
    saveCookieChoice(choice)
    setOpen(false)
    void logCookieChoice(choice, locale)
  }

  return (
    <section className={styles.notice} role="region" aria-label={t.privacy.cookies.label} data-cookie-notice>
      <p className={styles.text}>
        {t.privacy.cookies.text}{' '}
        <Link href={LEGAL_LINKS.policy} className={styles.more}>
          {t.privacy.cookies.more}
        </Link>
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={() => choose('all')}>
          {t.privacy.cookies.all}
        </button>
        <button type="button" className={styles.secondary} onClick={() => choose('necessary')}>
          {t.privacy.cookies.necessary}
        </button>
      </div>
    </section>
  )
}
