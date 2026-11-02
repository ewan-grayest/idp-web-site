'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

import { ArrowIcon, CloseIcon } from '@/components/shell/Icons'
import { useI18n } from '@/i18n/client'
import { Link } from '@/i18n/Link'
import type { Photo } from '@/lib/projects'
import styles from './Viewer.module.css'

const TagIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" aria-hidden>
    <path d="M3 12V4h8l10 10-8 8z" />
    <circle cx="7.5" cy="8.5" r="1.5" />
  </svg>
)

/**
 * 5.1-a expanded image viewer: full screen photo 5.1.2, shopping hotspots 5.1.3 (each opens its GT partner),
 * Close 5.1.4, hotspots on/off 5.1.5. Arrow keys and swipe move between photos; Esc closes.
 * Products are hidden until the visitor turns them on (Ewan, 2026-10-26). On a photo with products the switch is
 * highlighted and blinks once; each label opens towards the middle of the photo and wraps to stay inside it.
 */
export function Viewer({ photos, start, onClose }: { photos: Photo[]; start: number; onClose: () => void }) {
  const { t } = useI18n()
  const [i, setI] = useState(start)
  const [tags, setTags] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const touchX = useRef<number | null>(null)
  const photo = photos[i]
  const n = photos.length
  const hasProducts = photo.hotspots.length > 0
  const go = (d: number) => setI((k) => (k + d + n) % n)

  useEffect(() => {
    const d = dialog.current
    d?.showModal()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      d?.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <dialog
      ref={dialog}
      className={`${styles.viewer} theme-dark`}
      aria-label={t.project.viewer}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
        touchX.current = null
      }}
      data-spec="5.1-a"
    >
      <div className={styles.stage} data-spec="5.1.2">
        <div className={styles.frame} style={{ aspectRatio: `${photo.width} / ${photo.height}`, width: `min(100vw, calc(100vh * ${photo.width / photo.height}))` }}>
          <Image src={photo.url} alt={photo.alt} fill sizes="100vw" className={styles.img} priority />
          {tags &&
            photo.hotspots.map((h, k) => {
              const spot = {
                className: styles.hotspot,
                style: { '--x': h.x, '--y': h.y } as React.CSSProperties,
                'data-side': h.x > 55 ? 'left' : 'right',
                'data-edge': h.y < 15 ? 'top' : h.y > 85 ? 'bottom' : undefined,
                'data-spec': '5.1.3',
              }
              const inner = (
                <>
                  <span className={styles.dot}>
                    <TagIcon />
                  </span>
                  {/* The product first and larger, the shop under it (Ewan, 2026-10-26) */}
                  <span className={styles.label}>
                    <span className={styles.name}>{h.name}</span>
                    {h.logo && <Image src={h.logo} alt={h.shop || h.name} width={100} height={48} style={{ objectFit: 'contain', maxWidth: '100%' }} />}
                    {h.shop && <span className={styles.shop}>{h.shop}</span>}
                  </span>
                </>
              )
              // No partner picked yet: the name only, not a link
              return h.href ? (
                <Link key={k} href={h.href} {...spot}>
                  {inner}
                </Link>
              ) : (
                <span key={k} tabIndex={0} {...spot} data-no-shop>
                  {inner}
                </span>
              )
            })}
        </div>
      </div>

      <span className={styles.count}>
        {i + 1} / {n}
      </span>

      {n > 1 && (
        <>
          <button type="button" className={`${styles.btn} ${styles.prev}`} aria-label={t.project.prev} onClick={() => go(-1)}>
            <ArrowIcon dir="left" />
          </button>
          <button type="button" className={`${styles.btn} ${styles.next}`} aria-label={t.project.next} onClick={() => go(1)}>
            <ArrowIcon dir="right" />
          </button>
        </>
      )}

      <button type="button" className={`${styles.btn} ${styles.close}`} aria-label={t.common.close} onClick={onClose} data-spec="5.1.4">
        <CloseIcon />
      </button>

      {photos.some((p) => p.hotspots.length > 0) && (
        <button
          type="button"
          className={`${styles.btn} ${styles.tags}`}
          aria-label={t.project.products}
          title={t.project.products}
          aria-pressed={tags}
          disabled={!hasProducts}
          data-has-products={hasProducts || undefined}
          onClick={() => setTags((on) => !on)}
          data-spec="5.1.5"
        >
          {/* A new ring for each photo with products, so the switch blinks once whenever one appears */}
          {hasProducts && <span key={i} className={styles.blink} aria-hidden />}
          <TagIcon />
        </button>
      )}
    </dialog>
  )
}
