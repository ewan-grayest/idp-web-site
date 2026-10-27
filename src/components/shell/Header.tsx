'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'

import { useI18n } from '@/i18n/client'
import { Link } from '@/i18n/Link'
import { defaultLocale, localeCodes } from '@/i18n/locales'
import { ENQUIRE_EVENT, type EnquireDetail } from '@/lib/enquire'
import { checkLead, readConsent, rememberConsent, sendLead } from '@/lib/leads'
import { personPath, projectKinds, projectPath, type ProjectKind } from '@/lib/routes'
import { applyTheme, currentTheme, THEME_EVENT, type Theme } from '@/lib/theme'
import { MailIcon, MoonIcon, PhoneIcon, SearchIcon, SunIcon } from './Icons'
import { LanguageLinks } from './LanguageLinks'
import { SiteMenu } from './SiteMenu'
import styles from './Header.module.css'

/** Header states from the design: a = phone, b = enquiry, c = search; plus the language list. */
type Mode = null | 'phone' | 'mail' | 'search' | 'lang'

type Hit = { key: string; title: string; text: string; href: string }
type ProjectDoc = { id: number; title: string; slug: string; kind: ProjectKind }
type PersonDoc = { id: number; name: string; slug: string; role?: string | null }

/** Header 0.1: fixed, contextual. Hidden on Home and Promo (see SiteChrome). */
export function Header({ title, phone, email: studioEmail }: { title: string; phone: string; email: string }) {
  const pathname = usePathname()
  const { locale, t, href } = useI18n()
  const [mode, setMode] = useState<Mode>(null)
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<Hit[] | null>(null)
  const [cta, setCta] = useState<EnquireDetail | null>(null)
  const [sectionTitle, setSectionTitle] = useState<string | null>(null)
  const mailRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const ids = useId()
  const [theme, setTheme] = useState<Theme | null>(null)

  // Theme switch: the real theme is only known in the browser (saved choice or system setting)
  useEffect(() => {
    const sync = () => setTheme(currentTheme())
    sync()
    window.addEventListener(THEME_EVENT, sync)
    return () => window.removeEventListener(THEME_EVENT, sync)
  }, [])

  // 0.1.9: unticked by default, remembered once ticked
  useEffect(() => setConsent(readConsent()), [])

  // A new page closes any open panel
  useEffect(() => setMode(null), [pathname])

  // Page CTAs open the enquiry with their own context (see lib/enquire)
  useEffect(() => {
    const onEnquire = (e: Event) => {
      setCta((e as CustomEvent<EnquireDetail>).detail)
      setMode('mail')
    }
    window.addEventListener(ENQUIRE_EVENT, onEnquire)
    return () => window.removeEventListener(ENQUIRE_EVENT, onEnquire)
  }, [])

  // 0.1.2 follows the section under the header: sections mark themselves with data-header-title
  useEffect(() => {
    setSectionTitle(null)
    const marked = Array.from(document.querySelectorAll<HTMLElement>('[data-header-title]'))
    if (!marked.length) return
    const update = () => {
      const line = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0
      let current: string | null = null
      for (const el of marked) if (el.getBoundingClientRect().top <= line + 1) current = el.dataset.headerTitle ?? null
      setSectionTitle(current)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [pathname])

  useEffect(() => {
    if (mode === 'mail') mailRef.current?.focus()
    if (mode === 'search') searchRef.current?.focus()
    if (mode !== 'mail') {
      setNote(null)
      setCta(null)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMode(null)
    if (mode) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode])

  // 0.1.11–0.1.14: search project titles and people's names as the visitor types.
  // In another language, Russian titles match too (texts not yet translated show in Russian)
  useEffect(() => {
    if (mode !== 'search' || query.trim().length < 2) {
      setHits(null)
      return
    }
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      const find = async <T extends { id: number }>(collection: string, field: string, fields: string[]): Promise<T[]> => {
        const search = async (matchIn: string) => {
          const q = new URLSearchParams({ [`where[${field}][like]`]: query.trim(), limit: '8', depth: '0', locale: matchIn })
          for (const f of fields) q.set(`select[${f}]`, 'true')
          const res = await fetch(`/api/v1/${collection}?${q}`, { signal: ctrl.signal })
          return res.ok ? (((await res.json()).docs ?? []) as T[]) : []
        }
        const found = await Promise.all(locale === defaultLocale ? [search(locale)] : [search(locale), search(defaultLocale)])
        const ids = [...new Set(found.flat().map((d) => d.id))]
        if (locale === defaultLocale || ids.length === 0) return found.flat()
        // Show every match in the visitor's language
        const q = new URLSearchParams({ 'where[id][in]': ids.join(','), limit: '16', depth: '0', locale })
        for (const f of fields) q.set(`select[${f}]`, 'true')
        const res = await fetch(`/api/v1/${collection}?${q}`, { signal: ctrl.signal })
        return res.ok ? (((await res.json()).docs ?? []) as T[]) : []
      }
      try {
        const [projects, people] = await Promise.all([
          find<ProjectDoc>('projects', 'title', ['title', 'slug', 'kind']),
          find<PersonDoc>('people', 'name', ['name', 'slug', 'role']),
        ])
        setHits([
          ...projects
            .filter((d) => d.kind in projectKinds)
            .map((d) => ({ key: `p${d.id}`, title: d.title, text: t.kinds[d.kind], href: projectPath(d.kind, d.slug) })),
          ...people.map((d) => ({ key: `t${d.id}`, title: d.name, text: d.role || t.header.team, href: personPath(d.slug) })),
        ])
      } catch {
        /* aborted or offline */
      }
    }, 250)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [mode, query, locale, t])

  const toggle = (m: Exclude<Mode, null>) => setMode((cur) => (cur === m ? null : m))

  const shownTitle = sectionTitle || title
  const enquiryContext = cta?.context ?? t.header.callBack(shownTitle || 'ID project')

  // 0.1.7: the mail button opens the field; pressing it again sends the enquiry
  async function onMail() {
    if (mode !== 'mail') return setMode('mail')
    const problem = checkLead({ email, consent })
    if (problem) return setNote(t.leads[problem])
    setSending(true)
    const ok = await sendLead({
      email,
      consent,
      originUrl: window.location.href,
      context: enquiryContext,
      entity: cta?.entity ?? { type: 'page', ref: pathname ?? '/' },
      locale,
    }).catch(() => false)
    setSending(false)
    if (ok) {
      setEmail('')
      setNote(t.header.thanks)
      setTimeout(() => setMode(null), 2500)
    } else {
      setNote(t.header.failed)
    }
  }

  return (
    <header className={styles.header} data-spec="0.1">
      <div className={styles.left}>
        {/* 0.1.1 opens the site menu (Ewan, 2026-10-26); Home is the menu's first link */}
        <SiteMenu buttonClassName={styles.logo} phone={phone} email={studioEmail}>
          <span>ID</span>
        </SiteMenu>
        <span className="spec-id">0.1.1</span>

        {mode === 'search' ? (
          <label className={styles.searchField}>
            <span className="visually-hidden">{t.header.searchLabel}</span>
            <input
              ref={searchRef}
              id={`${ids}-q`}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={styles.input}
              data-spec="0.1.11"
              autoComplete="off"
            />
          </label>
        ) : (
          <div className={styles.titleWrap}>
            <span className={styles.rule} aria-hidden />
            <p className={styles.title} data-spec="0.1.2">
              {mode === 'mail' ? enquiryContext : shownTitle}
            </p>
            <span className="spec-id">0.1.2</span>
          </div>
        )}
      </div>

      <div className={styles.right}>
        {mode === 'phone' && (
          <a className={styles.phone} href={`tel:${phone.replace(/[^\d+]/g, '')}`} data-spec="0.1.6">
            {phone}
          </a>
        )}
        {mode === 'mail' && (
          <label className={styles.mailField}>
            <span className="visually-hidden">{t.header.emailLabel}</span>
            <input
              ref={mailRef}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="@mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onMail()}
              className={styles.input}
              data-spec="0.1.7"
            />
          </label>
        )}

        <button
          type="button"
          className={styles.iconBtn}
          aria-pressed={mode === 'phone'}
          aria-label={t.header.call}
          onClick={() => toggle('phone')}
          data-spec="0.1.3"
        >
          <PhoneIcon />
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          aria-pressed={mode === 'mail'}
          aria-label={mode === 'mail' ? t.header.send : t.header.write}
          onClick={onMail}
          disabled={sending}
          data-spec="0.1.4"
        >
          <MailIcon />
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          aria-pressed={mode === 'search'}
          aria-label={t.header.search}
          onClick={() => toggle('search')}
          data-spec="0.1.5"
        >
          <SearchIcon />
        </button>
        <button
          type="button"
          className={`${styles.iconBtn} ${styles.themeBtn}`}
          aria-label={theme === 'dark' ? t.header.toLight : t.header.toDark}
          onClick={() => applyTheme(theme === 'dark' ? 'light' : 'dark')}
          data-theme-switch
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
        <button
          type="button"
          className={`${styles.iconBtn} ${styles.langBtn}`}
          aria-pressed={mode === 'lang'}
          aria-label={t.header.language}
          onClick={() => toggle('lang')}
          data-language-switch
        >
          {localeCodes[locale]}
        </button>
        <span className="spec-id">0.1.3–5</span>
      </div>

      {mode === 'lang' && <LanguageLinks className={styles.langs} itemClassName={styles.lang} />}

      {mode === 'mail' && (
        <div className={styles.consent} data-spec="0.1.8">
          <label className={styles.consentLabel}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked)
                rememberConsent(e.target.checked)
              }}
              data-spec="0.1.9"
            />
            <span data-spec="0.1.10">{t.header.consent}</span>
          </label>
          {/* The consent text in full: Legal page 14, document «personal-data» */}
          <a href={href('/legal#personal-data')} target="_blank" rel="noopener" className={styles.consentTerms} aria-label={t.header.consentTerms}>
            {t.header.consentTermsShort} ↗
          </a>
          {note && (
            <p className={styles.note} role="status">
              {note}
            </p>
          )}
        </div>
      )}

      {mode === 'search' && (
        <div className={styles.results} data-spec="0.1.12" aria-live="polite">
          <p className={styles.resultsHead}>
            {hits === null ? t.header.searchHint : t.header.found(hits.length)}
          </p>
          {hits?.map((h) => (
            <Link key={h.key} href={h.href} className={styles.hit}>
              <span className={styles.hitTitle} data-spec="0.1.13">
                {h.title}
              </span>
              <span className={styles.hitText} data-spec="0.1.14">
                {h.text}
              </span>
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
