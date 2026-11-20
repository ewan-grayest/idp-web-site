'use client'
/* A file of «Фото и видео» full screen, from the list or the file's page (Ewan, 2026-11-20): the original file,
   whole, on a dark ground. Arrows (buttons, keys or a swipe) walk through the files of the list's page; Esc, the
   close button or a click beside the photo close it. «На весь монитор» also hides the browser where it allows. */
import { Link, useConfig } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'
import React, { useEffect, useRef, useState } from 'react'

import { fresh, isImage, isVideo, type MediaDoc } from './file'
import styles from './Media.module.css'
import { useMediaTexts } from './texts'

const megabytes = (bytes?: number | null) => (bytes ? `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB` : '')

export function MediaLightbox({ docs, start, onClose, editLink = true }: { docs: MediaDoc[]; start: number; onClose: () => void; editLink?: boolean }) {
  const t = useMediaTexts()
  const { config } = useConfig()
  const dialog = useRef<HTMLDialogElement>(null)
  const touchX = useRef<number | null>(null)
  const [i, setI] = useState(start)
  const [whole, setWhole] = useState(false)
  const n = docs.length
  const doc = docs[Math.min(i, n - 1)]
  const go = (d: number) => setI((k) => (k + d + n) % n)

  useEffect(() => {
    const d = dialog.current
    d?.showModal()
    const onScreen = () => setWhole(document.fullscreenElement === d)
    document.addEventListener('fullscreenchange', onScreen)
    return () => {
      document.removeEventListener('fullscreenchange', onScreen)
      if (document.fullscreenElement === d) document.exitFullscreen().catch(() => {})
      d?.close()
    }
  }, [])

  if (!doc) return null
  const canFill = typeof document !== 'undefined' && document.fullscreenEnabled
  const toggleScreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else dialog.current?.requestFullscreen().catch(() => {})
  }
  const facts = [doc.width && doc.height ? `${doc.width} × ${doc.height}` : '', megabytes(doc.filesize)].filter(Boolean).join(' · ')

  return (
    <dialog
      ref={dialog}
      className={styles.lightbox}
      aria-label={doc.filename ?? ''}
      data-media-lightbox
      onCancel={(e) => {
        // Esc first leaves the whole-monitor mode, as the browser does, then closes
        e.preventDefault()
        if (!document.fullscreenElement) onClose()
      }}
      onKeyDown={(e) => {
        if (n < 2) return
        if (e.key === 'ArrowRight') go(1)
        if (e.key === 'ArrowLeft') go(-1)
      }}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null || n < 2) return
        const dx = e.changedTouches[0].clientX - touchX.current
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
        touchX.current = null
      }}
    >
      <div
        className={styles.lightboxStage}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        {isVideo(doc) ? (
          // No autoplay: the person starts it, so reduced motion needs nothing more
          <video key={doc.id} src={fresh(doc.url, doc)} controls playsInline className={styles.lightboxMedia} />
        ) : isImage(doc) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={doc.id} src={fresh(doc.url, doc)} alt={doc.alt ?? ''} className={styles.lightboxMedia} decoding="async" />
        ) : null}
      </div>

      <div className={styles.lightboxBar}>
        <div className={styles.lightboxTitle}>
          <span className={styles.lightboxName}>{doc.filename}</span>
          <span className={styles.lightboxFacts}>
            {n > 1 && `${i + 1} / ${n}`}
            {n > 1 && facts && ' · '}
            {facts}
          </span>
        </div>
        {editLink && (
          <Link
            href={formatAdminURL({ adminRoute: config.routes.admin, path: `/collections/media/${encodeURIComponent(String(doc.id))}` })}
            prefetch={false}
            className={styles.lightboxLink}
          >
            {t.edit}
          </Link>
        )}
        {canFill && (
          <button type="button" className={styles.lightboxButton} onClick={toggleScreen} aria-label={whole ? t.screenExit : t.screen} title={whole ? t.screenExit : t.screen} aria-pressed={whole}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <rect x="2" y="3.5" width="16" height="11" />
              <path d="M7 17.5h6" />
            </svg>
          </button>
        )}
        <button type="button" className={styles.lightboxButton} onClick={onClose} aria-label={t.close} title={t.close} data-media-lightbox-close>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <path d="M4 4l12 12M16 4L4 16" />
          </svg>
        </button>
      </div>

      {n > 1 && (
        <>
          <button type="button" className={`${styles.lightboxButton} ${styles.lightboxPrev}`} onClick={() => go(-1)} aria-label={t.prev} title={t.prev}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <path d="M14 4l-7 7 7 7" />
            </svg>
          </button>
          <button type="button" className={`${styles.lightboxButton} ${styles.lightboxNext}`} onClick={() => go(1)} aria-label={t.next} title={t.next}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <path d="M8 4l7 7-7 7" />
            </svg>
          </button>
        </>
      )}
    </dialog>
  )
}
