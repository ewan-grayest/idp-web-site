'use client'

import { useState } from 'react'

import { useI18n } from '@/i18n/client'

import styles from './Project.module.css'

/** 5.7 sharing: VK 5.7.1, Facebook 5.7.2, short link 5.7.3 → field 5.7.4 (system share sheet on phones). */
export function Share({ title, url, shortUrl }: { title: string; url: string; shortUrl?: string }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const link = shortUrl ?? url
  const vk = `https://vk.com/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`

  async function onShort() {
    if (typeof navigator.share === 'function' && window.matchMedia('(hover: none)').matches) {
      await navigator.share({ title, url: link }).catch(() => {})
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
      <a className={styles.shr} href={vk} target="_blank" rel="noopener" data-spec="5.7.1">{t.project.vk}</a>
      <a className={styles.shr} href={fb} target="_blank" rel="noopener" data-spec="5.7.2">Facebook</a>
      <button type="button" className={styles.shr} onClick={onShort} data-spec="5.7.3">
        {t.project.shortLink}
      </button>
      {open && (
        <label className={styles.shortField} data-spec="5.7.4">
          <span className="visually-hidden">{t.project.shortLink}</span>
          <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
          <span className={styles.copied} role="status">{copied ? t.project.copied : ''}</span>
        </label>
      )}
      <span className="spec-id">5.7.1–5.7.4</span>
    </div>
  )
}
