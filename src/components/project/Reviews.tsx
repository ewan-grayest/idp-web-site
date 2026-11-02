'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useI18n } from '@/i18n/client'
import { Link } from '@/i18n/Link'
import styles from '@/components/shared/Social.module.css'
import { socialCopy } from '@/lib/socialCopy'

type Network = 'vk' | 'facebook'
type Review = { id: number; name: string; text: string; date: string; network: Network; sourceUrl?: string | null }
type VKApi = { init: (options: { apiId: number; onlyWidgets: boolean }) => void; Widgets: { Comments: (id: string, options: { limit: number; attach: false; pageUrl: string }, pageId: string) => void } }
declare global { interface Window { VK?: VKApi } }

export function Reviews({ project, title, url, items, limit, defaultNetwork, vkAppId, facebookAppId }: {
  project: number; title: string; url: string; items: Review[]; limit: number; defaultNetwork: Network; vkAppId?: string | null; facebookAppId?: string | null
}) {
  const { locale, t } = useI18n()
  const copy = socialCopy[locale]
  const [network, setNetwork] = useState<Network>(defaultNetwork)
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState('')
  const [widget, setWidget] = useState(false)
  const host = useRef<HTMLDivElement>(null)
  const widgetId = useId().replace(/[^a-zA-Z0-9]/g, '')
  useEffect(() => {
    try {
      const saved = localStorage.getItem('idp-social-network')
      const referrer = document.referrer ? new URL(document.referrer).hostname : ''
      if (saved === 'vk' || saved === 'facebook') setNetwork(saved)
      else if (/(^|\.)(vk\.(com|ru)|facebook\.com)$/.test(referrer)) setNetwork(referrer.includes('facebook') ? 'facebook' : 'vk')
    } catch { /* default remains usable */ }
  }, [])

  useEffect(() => {
    if (!widget || network !== 'vk' || !vkAppId) return
    let cancelled = false
    const mount = () => {
      if (cancelled || !window.VK || !host.current) return
      host.current.replaceChildren()
      const container = document.createElement('div'); container.id = widgetId; host.current.append(container)
      window.VK.init({ apiId: Number(vkAppId), onlyWidgets: true })
      window.VK.Widgets.Comments(widgetId, { limit, attach: false, pageUrl: url }, `project-${project}`)
    }
    let script = document.querySelector<HTMLScriptElement>('script[data-vk-comments]')
    if (window.VK) mount()
    else {
      if (!script) { script = document.createElement('script'); script.src = 'https://vk.com/js/api/openapi.js'; script.async = true; script.dataset.vkComments = 'true'; document.head.append(script) }
      script.addEventListener('load', mount)
    }
    return () => { cancelled = true; script?.removeEventListener('load', mount); host.current?.replaceChildren() }
  }, [widget, network, vkAppId, widgetId, project, url, limit])

  function choose(next: Network) {
    setNetwork(next); setWidget(false)
    try { localStorage.setItem('idp-social-network', next) } catch { /* storage disabled */ }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    if (!form.reportValidity() || sending) return
    const data = new FormData(form)
    setSending(true); setStatus('')
    try {
      const res = await fetch('/api/v1/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: data.get('name'), text: data.get('text'), consent: data.get('consent') === 'on', project, network, originUrl: window.location.href }) })
      if (!res.ok) throw new Error('Review rejected')
      form.reset(); setStatus(copy.thanks)
    } catch { setStatus(t.header.failed) }
    finally { setSending(false) }
  }

  const providerReady = network === 'vk' ? Boolean(vkAppId) : Boolean(facebookAppId)
  return <section className={styles.section} data-spec="5.9" data-header-title={copy.heading}>
    <div className={styles.heading}><h2>{copy.heading}</h2><span>{title}</span></div>
    <div className={styles.networks} role="group" aria-label={copy.network} data-spec="5.9.1">
      {(['vk', 'facebook'] as const).map((n) => <button key={n} type="button" className={styles.network} aria-pressed={network === n} onClick={() => choose(n)}>{n === 'vk' ? 'VK' : 'Facebook'}</button>)}
    </div>
    <ul className={styles.reviews} data-spec="5.9.2">{items.filter((r) => r.network === network).slice(0, limit).map((r) => <li key={r.id} className={styles.review}>
      <div className={styles.meta}><strong>{r.name}</strong><time dateTime={r.date}>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(r.date))}</time></div>
      <p>{r.text}</p>{r.sourceUrl && <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer">{copy.original} ↗</a>}
    </li>)}</ul>
    <form className={styles.form} onSubmit={submit} data-spec="5.9.3" aria-label={copy.leave}>
      <label>{copy.name}<input name="name" required maxLength={100} autoComplete="name" /></label>
      <label>{copy.leave}<textarea name="text" required minLength={10} maxLength={3000} onFocus={() => window.dispatchEvent(new CustomEvent('idp-review-context', { detail: `${copy.leave} · ${title}` }))} onBlur={() => window.dispatchEvent(new CustomEvent('idp-review-context', { detail: null }))} /></label>
      <label className={styles.consent}><input name="consent" type="checkbox" required /><span>{t.header.consent} · <Link href="/legal#personal-data">{t.header.consentTermsShort}</Link></span></label>
      <p className={styles.note}>{copy.moderation}</p>
      <button type="submit" className={styles.submit} disabled={sending} aria-busy={sending} data-spec="5.9.4">{t.header.send}</button>
      <p role="status">{status}</p>
    </form>
    {providerReady && <div>
      <button type="button" className={styles.network} aria-expanded={widget} onClick={() => setWidget((v) => !v)}>{copy.socialComments}</button>
      {widget && (network === 'vk' ? <div ref={host} className={styles.widget} /> : <iframe className={styles.widget} title="Facebook comments" src={`https://www.facebook.com/plugins/comments.php?href=${encodeURIComponent(url)}&numposts=${limit}&order_by=reverse_time&width=680&appId=${facebookAppId}`} />)}
    </div>}
  </section>
}
