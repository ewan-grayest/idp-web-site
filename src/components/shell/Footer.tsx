'use client'

import { useI18n } from '@/i18n/client'
import { Link } from '@/i18n/Link'
import type { Contacts } from '@/lib/pages'
import { footerColumns, sisterSites } from '@/lib/site'
import { LanguageLinks } from './LanguageLinks'
import styles from './Footer.module.css'

/** Footer 0.3: full width green band, link columns on the 80% grid. */
export function Footer({ social }: { social: Contacts['social'] }) {
  const { t } = useI18n()
  return (
    <footer className={styles.footer} data-spec="0.3">
      <div className={styles.inner}>
        <ul className={styles.social}>
          {social.map((s) => (
            <li key={s.id}>
              <a href={s.href} rel="noopener" target="_blank" data-spec={s.id}>
                {t.footer.social[s.key]}
              </a>{' '}
              <span className="spec-id">{s.id}</span>
            </li>
          ))}
        </ul>

        <div className={styles.columns} data-spec="0.3.5">
          {footerColumns.map((col) => (
            <nav key={col.key} aria-label={t.footer.columns[col.key]} className={styles.col}>
              {col.links.map((l) => (
                <Link key={l.key} href={l.href}>
                  {t.footer.links[l.key]}
                </Link>
              ))}
            </nav>
          ))}
        </div>

        <div className={styles.bottom}>
          {sisterSites.map((s) => (
            <Link key={s.id} href={s.href} className={styles.sister} data-spec={s.id}>
              {s.label}
            </Link>
          ))}
          <span className="spec-id">0.3.6–0.3.8</span>
          <LanguageLinks className={styles.langs} pill />
          <span className={styles.copy}>© ID project, {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  )
}
