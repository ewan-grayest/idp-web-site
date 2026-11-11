'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useI18n } from '@/i18n/client'
import { Link } from '@/i18n/Link'
import { splitLocale } from '@/i18n/locales'
import { menuMain, menuMore } from '@/lib/site'
import { applyTheme, currentTheme, THEME_EVENT, type Theme } from '@/lib/theme'
import { CloseIcon, MoonIcon, SunIcon } from './Icons'
import { LanguageLinks } from './LanguageLinks'
import styles from './SiteMenu.module.css'

/**
 * Site menu: every section one click away, opened by the ID logo 0.1.1 at the top left of the header (Ewan, 2026-10-26;
 * a separate button at the right from 2026-11-02, back on the logo since 2026-11-11). Home has none. Not in the spec,
 * which only had the footer 0.3.5: added when Ewan found the site had no navigation (2026-10-25). The menu's first link
 * and its own logo lead to Home.
 * Opens over the page; Escape or the cross closes it and gives focus back to the button; a link closes it too.
 */
export function SiteMenu({ buttonClassName, children, phone, email, spec }: { buttonClassName: string; children: React.ReactNode; phone: string; email: string; spec?: string }) {
  const { t } = useI18n()
  const { path } = splitLocale(usePathname() || '/')
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState<Theme | null>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const refocus = useRef(false)
  const id = useId()

  useEffect(() => {
    setMounted(true)
    const sync = () => setTheme(currentTheme())
    sync()
    window.addEventListener(THEME_EVENT, sync)
    return () => window.removeEventListener(THEME_EVENT, sync)
  }, [])

  // A new page closes the menu
  useEffect(() => setOpen(false), [path])

  useEffect(() => {
    if (!open) return
    const root = document.documentElement
    const overflow = root.style.overflow
    root.style.overflow = 'hidden'
    panel.current?.querySelector<HTMLElement>('[data-menu-close]')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return close()
      if (e.key !== 'Tab' || !panel.current) return
      // Keep keyboard focus inside the open menu
      const items = panel.current.querySelectorAll<HTMLElement>('a[href], button')
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      root.style.overflow = overflow
      window.removeEventListener('keydown', onKey)
      if (refocus.current) button.current?.focus()
      refocus.current = false
    }
  }, [open])

  function close() {
    refocus.current = true
    setOpen(false)
  }

  // Links to a section of the current page (/studio#team) don't change the address, so they close the menu themselves
  const go = () => setOpen(false)
  const current = (href: string) => (href === path ? 'page' : undefined)

  return (
    <>
      <button
        ref={button}
        type="button"
        className={buttonClassName}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t.menu.open}
        onClick={() => setOpen(true)}
        data-site-menu
        data-spec={spec}
      >
        {children}
      </button>

      {open &&
        mounted &&
        createPortal(
          <div ref={panel} id={id} className={styles.panel} role="dialog" aria-modal="true" aria-label={t.menu.label} data-site-menu-panel>
            <div className={styles.top}>
              <Link href="/" className={styles.logo} aria-label={t.header.home} onClick={go}>
                ID
              </Link>
              <button type="button" className={styles.close} aria-label={t.menu.close} onClick={close} data-menu-close>
                <CloseIcon />
              </button>
            </div>

            <div className={styles.body}>
              <nav className={styles.main} aria-label={t.menu.sections}>
                {menuMain.map((l, i) => (
                  <Link key={l.key} href={l.href} className={styles.mainLink} aria-current={current(l.href)} onClick={go}>
                    <span className={styles.num} aria-hidden>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {t.menu.links[l.key]}
                  </Link>
                ))}
              </nav>

              <div className={styles.side}>
                <nav className={styles.more} aria-label={t.menu.more}>
                  <p className={styles.lab}>{t.menu.more}</p>
                  {menuMore.map((l) => (
                    <Link key={l.key} href={l.href} className={styles.moreLink} aria-current={current(l.href)} onClick={go}>
                      {t.menu.links[l.key]}
                    </Link>
                  ))}
                </nav>

                <div className={styles.more}>
                  <p className={styles.lab}>{t.menu.contacts}</p>
                  <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className={styles.moreLink}>
                    {phone}
                  </a>
                  <a href={`mailto:${email}`} className={styles.moreLink}>
                    {email}
                  </a>
                </div>

                <div className={styles.settings}>
                  <LanguageLinks className={styles.langs} itemClassName={styles.lang} />
                  {theme && (
                    <button
                      type="button"
                      className={styles.theme}
                      onClick={() => applyTheme(theme === 'dark' ? 'light' : 'dark')}
                    >
                      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                      {theme === 'dark' ? t.header.toLight : t.header.toDark}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
