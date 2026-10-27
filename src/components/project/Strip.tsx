'use client'

import Image from 'next/image'
import { useState } from 'react'

import { useI18n } from '@/i18n/client'
import type { Photo } from '@/lib/projects'
import { Viewer } from './Viewer'
import styles from './Project.module.css'

/**
 * 5.1 presentation strip: 7 frames visible on desktop (2½ on phones), any number in total (5.1.1),
 * scrolls sideways. A frame opens the viewer 5.1-a.
 * Reading of "up to 7" as the visible count is an ASSUMPTION awaiting Ewan.
 */
export function Strip({ photos, kindLabel, title }: { photos: Photo[]; kindLabel: string; title: string }) {
  const { t } = useI18n()
  const [open, setOpen] = useState<number | null>(null)
  return (
    <section className={`${styles.sec} ${styles.strip}`} aria-label={t.project.presentation} data-spec="5.1">
      <div className={styles.stripHead}>
        <span className={styles.lab}>{kindLabel}</span>
        <h1 className={styles.title}>{title}</h1>
      </div>
      <div className={styles.stripTrack} data-spec="5.1.1">
        {photos.length === 0 && <div className={styles.empty}>{t.project.noPhotos}</div>}
        {photos.map((p, k) => (
          <button key={k} type="button" className={styles.frame} onClick={() => setOpen(k)} aria-label={t.project.openFrame(k + 1)}>
            <Image src={p.url} alt={p.alt} fill sizes="40vw" className={styles.cover} priority={k < 7} />
            <span className={styles.num}>{String(k + 1).padStart(2, '0')}</span>
          </button>
        ))}
      </div>
      <span className="spec-id">5.1 · 5.1.1</span>
      {open !== null && <Viewer photos={photos} start={open} onClose={() => setOpen(null)} />}
    </section>
  )
}
