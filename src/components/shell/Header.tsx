'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'

import { useI18n } from '@/i18n/client'
import { Link } from '@/i18n/Link'
import { defaultLocale } from '@/i18n/locales'
import { ENQUIRE_EVENT, type EnquireDetail } from '@/lib/enquire'
import { checkLead, forgetRememberedConsent, sendLead } from '@/lib/leads'
import { LEGAL_LINKS } from '@/lib/privacy'
import { personPath, projectKinds, projectPath, type ProjectKind } from '@/lib/routes'
import { applyTheme, currentTheme, THEME_EVENT, type Theme } from '@/lib/theme'
import { MailIcon, MoonIcon, PhoneIcon, SearchIcon, SendIcon, SunIcon } from './Icons'
import { SiteMenu } from './SiteMenu'
import styles from './Header.module.css'

/** Header states from the design: a = phone, b = enquiry, c = search. Languages are at the foot of the page. */
type Mode = null | 'phone' | 'mail' | 'search'

type Hit = { key: string; title: string; text: string; href: string }
type ProjectDoc = { id: number; title: string; slug: string; kind: ProjectKind }
type PersonDoc = { id: number; name: string; slug: string; role?: string | null }
type PartnerDoc = { id: number; name: string; slug: string }
type EntryDoc = { id: number; title: string; slug: string }
type PressDoc = { id: number; title: string; source: string; url?: string }

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
  const [reviewContext, setReviewContext] = useState<string | null>(null)
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

  // 0.1.9: unticked every time (152-ФЗ), and never carried over from an earlier visit
  useEffect(() => forgetRememberedConsent(), [])

  // A new page closes any open panel
  useEffect(() => setMode(null), [pathname])
  useEffect(() => {
    const update = (event: Event) => setReviewContext((event as CustomEvent<string | null>).detail)
    window.addEventListener('idp-review-context', update)
    return () => window.removeEventListener('idp-review-context', update)
  }, [])

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
      // `only`: more conditions; projects keep to published ones even for signed-in staff (Ewan, 2026-11-05)
      const find = async <T extends { id: number }>(collection: string, field: string, fields: string[], only: Record<string, string> = {}): Promise<T[]> => {
        const search = async (matchIn: string) => {
          const q = new URLSearchParams({ ...only, [`where[${field}][like]`]: query.trim(), limit: '8', depth: '0', locale: matchIn })
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
        const [projects, people, partners, lifestyle, careers, legal, press] = await Promise.all([
          find<ProjectDoc>('projects', 'title', ['title', 'slug', 'kind'], { 'where[publishOnSite][not_equals]': 'false' }),
          find<PersonDoc>('people', 'name', ['name', 'slug', 'role']),
          find<PartnerDoc>('partners', 'name', ['name', 'slug']),
          find<EntryDoc>('lifestyle', 'title', ['title', 'slug']),
          find<EntryDoc>('careers', 'title', ['title', 'slug']),
          find<EntryDoc>('legal', 'title', ['title', 'slug']),
          find<PressDoc>('press', 'title', ['title', 'source', 'url']),
        ])
        setHits([
          ...projects
            .filter((d) => d.kind in projectKinds)
            .map((d) => ({ key: `p${d.id}`, title: d.title, text: t.kinds[d.kind], href: projectPath(d.kind, d.slug) })),
          ...people.map((d) => ({ key: `t${d.id}`, title: d.name, text: d.role || t.header.team, href: personPath(d.slug) })),
          ...partners.map((d) => ({ key: `partner${d.id}`, title: d.name, text: t.pages[6], href: `/partners#${d.slug}` })),
          ...([{ docs: lifestyle, path: '/journal', page: 11 }, { docs: careers, path: '/careers', page: 13 }, { docs: legal, path: '/legal', page: 14 }] as const).flatMap(({ docs, path, page }) => docs.map((d) => ({ key: `${path}${d.id}`, title: d.title, text: t.pages[page], href: `${path}#${d.slug}` }))),
          ...press.map((d) => ({ key: `press${d.id}`, title: d.title, text: d.source || t.pages[10], href: d.url || '/press' })),
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

  const shownTitle = reviewContext || sectionTitle || title
  const enquiryContext = cta?.context ?? t.header.callBack(shownTitle || 'ID project')

  // 0.1.7: the mail button opens the field; pressing it again sends the enquiry
  async function onMail() {
    if (mode !== 'mail') return setMode('mail')
    if (!email.trim()) return setMode(null)
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
      setConsent(false)
      setNote(t.header.thanks)
      setTimeout(() => setMode(null), 2500)
    } else {
      setNote(t.header.failed)
    }
  }

  return (
    <header className={styles.header} data-spec="0.1">
      <div className={styles.left}>
        {/* 0.1.1 opens the site menu, as before 2026-11-02; Home is the menu's first link (Ewan, 2026-11-11) */}
        <SiteMenu buttonClassName={styles.logo} phone={phone} email={studioEmail} spec="0.1.1">
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
        {/* 0.1.7 and 0.1.4 as one rounded field: the mail button turns into its send button */}
        <div className={styles.mailBar} data-open={mode === 'mail' || undefined}>
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
                className={styles.mailInput}
                data-spec="0.1.7"
              />
            </label>
          )}
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.mailBtn}`}
            aria-pressed={mode === 'mail'}
            aria-label={mode === 'mail' ? t.header.send : t.header.write}
            onClick={onMail}
            disabled={sending}
            data-spec="0.1.4"
          >
            {mode === 'mail' ? <SendIcon /> : <MailIcon />}
          </button>
        </div>
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
        <span className="spec-id">0.1.3–5</span>
      </div>

      {mode === 'mail' && (
        <div className={styles.consent} data-spec="0.1.8">
          <label className={styles.consentLabel}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              data-spec="0.1.9"
            />
            <span data-spec="0.1.10">{t.header.consent}</span>
          </label>
          {/* The consent text in full and the policy: Legal page 14, documents «personal-data» and «privacy» */}
          <span className={styles.consentTerms}>
            <a href={href(LEGAL_LINKS.consent)} target="_blank" rel="noopener" aria-label={`${t.privacy.consentDoc} ${t.privacy.newTab}`}>
              {t.privacy.consentDoc} ↗
            </a>
            {' · '}
            <a href={href(LEGAL_LINKS.policy)} target="_blank" rel="noopener" aria-label={`${t.privacy.policy} ${t.privacy.newTab}`}>
              {t.privacy.policy} ↗
            </a>
          </span>
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
