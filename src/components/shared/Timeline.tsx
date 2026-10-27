'use client'

import Image from 'next/image'
import { useState } from 'react'

import { useI18n } from '@/i18n/client'
import { Link } from '@/i18n/Link'

import styles from './Timeline.module.css'
import { useDock } from './useDock'

export type TimelineEvent = { key: string; date: string; title: string; text?: string | null; image?: string; link?: string | null }

/**
 * Reusable horizontal achievement/history timeline (3.3, 4.2, 5.8). Newest on the left, as the spec says.
 * A dot selects the event; the card below shows its title, text and optional image.
 * With a mouse the years magnify like the macOS Dock. On phones the line becomes scrollable year tabs.
 */
export function Timeline({ events, spec }: { events: TimelineEvent[]; spec: string }) {
  const { t } = useI18n()
  const sorted = [...events].sort((a, b) => b.date.localeCompare(a.date))
  const [i, setI] = useState(0)
  const dock = useDock<HTMLDivElement>()
  const ev = sorted[i]
  if (!ev) return null
  return (
    <div className={styles.timeline} data-spec={spec}>
      <div ref={dock} className={styles.line} role="tablist" data-dock aria-label={t.common.events}>
        {sorted.map((e, k) => (
          <button
            key={e.key}
            type="button"
            role="tab"
            aria-selected={k === i}
            className={styles.point}
            onClick={() => setI(k)}
          >
            <span>{e.date.slice(0, 4)}</span>
            <span className={styles.dot} aria-hidden />
          </button>
        ))}
      </div>
      <div className={styles.card} role="tabpanel">
        {ev.image && (
          <div className={styles.img}>
            <Image src={ev.image} alt="" fill sizes="300px" style={{ objectFit: 'cover' }} />
          </div>
        )}
        <div className={styles.body}>
          <span className={styles.title}>{ev.title}</span>
          {ev.text && <p className={styles.text}>{ev.text}</p>}
          {ev.link && (
            <Link href={ev.link} className={styles.more}>
              {t.common.more}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
