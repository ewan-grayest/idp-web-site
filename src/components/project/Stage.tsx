'use client'

import Image from 'next/image'
import { useState } from 'react'

import { useI18n } from '@/i18n/client'
import type { Photo } from '@/lib/projects'
import { Viewer } from './Viewer'
import styles from './Project.module.css'

/** Concept 5.4, Preview 5.5, Process 5.6: sideways gallery (.1), text (.2), photos open full screen (.3). */
export function Stage({ spec, title, photos, text, flip }: { spec: string; title: string; photos: Photo[]; text?: string | null; flip?: boolean }) {
  const { t } = useI18n()
  const [open, setOpen] = useState<number | null>(null)
  if (!photos.length && !text) return null
  return (
    <section className={`${styles.sec} ${styles.stage}`} data-spec={spec} data-header-title={title}>
      <h2 className={styles.h2}>
        {title} <span className="spec-id">{spec}</span>
      </h2>
      <div className={styles.stageBody} data-flip={flip || undefined}>
        <div className={styles.stageTrack} data-spec={`${spec}.1`}>
          {photos.map((p, k) => (
            <button key={k} type="button" className={styles.stagePhoto} onClick={() => setOpen(k)} aria-label={t.project.openPhoto(title, k + 1)} data-spec={`${spec}.3`}>
              <Image src={p.thumb} alt={p.alt} fill sizes="(max-width: 767px) 80vw, 40vw" className={styles.cover} />
            </button>
          ))}
        </div>
        {text && (
          <div className={styles.stageText} data-spec={`${spec}.2`}>
            {text.split(/\n{2,}/).map((para, k) => (
              <p key={k}>{para}</p>
            ))}
          </div>
        )}
      </div>
      {open !== null && <Viewer photos={photos} start={open} onClose={() => setOpen(null)} />}
    </section>
  )
}
