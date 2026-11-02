'use client'

import { useEffect, useState } from 'react'

import { useI18n } from '@/i18n/client'

import styles from './Project.module.css'

/** 5.7 sharing: VK 5.7.1, Facebook 5.7.2, short link 5.7.3 → field 5.7.4 (system share sheet on phones). */
export function Share({ title, url, shortUrl, spec = '5.7', entries }: { title: string; url: string; shortUrl?: string; spec?: '5.7' | '11.2'; entries?: { slug: string; title: string; shortUrl?: string }[] }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [hash, setHash] = useState('')
  useEffect(() => {
    if (!entries) return
    const update = () => { setHash(window.location.hash.slice(1)); setOpen(false); setCopied(false) }
    update()
    window.addEventListener('hashchange', update)
    window.addEventListener('idp-entry-change', update)
    return () => { window.removeEventListener('hashchange', update); window.removeEventListener('idp-entry-change', update) }
  }, [entries])
  const selected = entries?.find((e) => e.slug === hash) ?? entries?.[0]
  const sharedUrl = selected ? `${url}#${selected.slug}` : url
  const sharedTitle = selected?.title ?? title
  const link = selected?.shortUrl ?? shortUrl ?? sharedUrl
  const vk = `https://vk.com/share.php?url=${encodeURIComponent(sharedUrl)}&title=${encodeURIComponent(sharedTitle)}`
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(sharedUrl)}`

  async function onShort() {
    if (typeof navigator.share === 'function' && window.matchMedia('(hover: none)').matches) {
      await navigator.share({ title: sharedTitle, url: link }).catch(() => {})
      return
    }
    setOpen(true)
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className={styles.shareRow}>
      <span className={styles.lab}>{t.project.share}</span>
      <a className={styles.shr} href={fb} target="_blank" rel="noopener noreferrer" data-spec={`${spec}.1`}>Facebook</a>
      <a className={styles.shr} href={vk} target="_blank" rel="noopener noreferrer" data-spec={`${spec}.2`}>{t.project.vk}</a>
      <button type="button" className={styles.shr} onClick={onShort} data-spec={`${spec}.3`}>
        {t.project.shortLink}
      </button>
      {open && (
        <label className={styles.shortField} data-spec={`${spec}.4`}>
          <span className="visually-hidden">{t.project.shortLink}</span>
          <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
          <span className={styles.copied} role="status">{copied ? t.project.copied : ''}</span>
        </label>
      )}
      <span className="spec-id">{spec}.1–{spec}.4</span>
    </div>
  )
}
