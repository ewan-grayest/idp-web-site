'use client'

import Image from 'next/image'
import { useId, useState } from 'react'

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
  const id = useId()
  const base = spec.split('.').slice(0, 2).join('.')
  const dock = useDock<HTMLDivElement>()
  const ev = sorted[i]
  if (!ev) return null
  return (
    <div className={styles.timeline}>
      <div ref={dock} className={styles.line} role="tablist" data-dock aria-label={t.common.events} data-spec={spec}>
        {sorted.map((e, k) => (
          <button
            key={e.key}
            type="button"
            role="tab"
            id={`${id}-event-${k}`}
            aria-controls={`${id}-panel`}
            tabIndex={k === i ? 0 : -1}
            aria-selected={k === i}
            className={styles.point}
            onClick={() => setI(k)}
            onKeyDown={(event) => {
              const next = { ArrowRight: k + 1, ArrowLeft: k - 1, Home: 0, End: sorted.length - 1 }[event.key]
              if (next === undefined) return
              event.preventDefault()
              const selected = (next + sorted.length) % sorted.length
              setI(selected)
              document.getElementById(`${id}-event-${selected}`)?.focus()
            }}
          >
            <span data-spec={`${base}.4`}>{e.date.slice(0, 4)}</span>
            <span className={styles.dot} aria-hidden data-spec={`${base}.3`} />
          </button>
        ))}
      </div>
      <div className={styles.card} role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-event-${i}`}>
        {ev.image && (
          <div className={styles.img} data-spec={`${base}.6`}>
            <Image src={ev.image} alt="" fill sizes="300px" style={{ objectFit: 'cover' }} />
          </div>
        )}
        <div className={styles.body} data-spec={`${base}.5`}>
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
