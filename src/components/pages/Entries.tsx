'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'

import { useI18n } from '@/i18n/client'
import styles from './Pages.module.css'
import { useHashPick } from './useHashPick'

export type EntryHead = { slug: string; when: string; title: string; images: { url: string; alt: string }[] }

/**
 * Pages 11, 13 and 14 (spec slide 3): a vertical timeline x.1.4 with the newest entry on top; the picked entry shows
 * its title x.1.1, photos x.1.2 (scroll sideways) and text x.1.3. Every entry is in the page for search engines,
 * the others are hidden. The address keeps the picked entry (/legal#personal-data), so it can be linked to.
 */
export function Entries({ items, bodies, spec }: { items: EntryHead[]; bodies: React.ReactNode[]; spec: string }) {
  const { t } = useI18n()
  const [i, setI] = useState(0)
  const panels = useRef<HTMLDivElement>(null)

  // Open the entry named in the address, now and when a link on this page changes it (footer «Авторское право»)
  useHashPick(items.map((x) => x.slug), setI)

  function pick(k: number) {
    setI(k)
    history.replaceState(null, '', `#${items[k].slug}`)
    const top = panels.current?.getBoundingClientRect().top ?? 0
    if (top < 0) panels.current?.scrollIntoView({ block: 'start' })
  }

  function onKey(e: React.KeyboardEvent, k: number) {
    const next = { ArrowDown: k + 1, ArrowRight: k + 1, ArrowUp: k - 1, ArrowLeft: k - 1, Home: 0, End: items.length - 1 }[e.key]
    if (next === undefined) return
    e.preventDefault()
    const n = (next + items.length) % items.length
    pick(n)
    document.getElementById(`tab-${items[n].slug}`)?.focus()
  }

  return (
    <div className={styles.entries}>
      <div className={styles.list} role="tablist" aria-orientation="vertical" aria-label={t.entries.list} data-spec={`${spec}.4`}>
        {items.map((e, k) => (
          <button
            key={e.slug}
            id={`tab-${e.slug}`}
            type="button"
            role="tab"
            aria-selected={k === i}
            aria-controls={`entry-${e.slug}`}
            tabIndex={k === i ? 0 : -1}
            className={styles.point}
            onClick={() => pick(k)}
            onKeyDown={(ev) => onKey(ev, k)}
          >
            <span className={styles.dot} aria-hidden data-spec={`${spec}.5`} />
            {e.when && <span className={styles.pointWhen}>{e.when}</span>}
            <span className={styles.pointTitle}>{e.title}</span>
          </button>
        ))}
      </div>

      <div className={styles.panels} ref={panels}>
        {items.map((e, k) => (
          <section
            key={e.slug}
            id={`entry-${e.slug}`}
            role="tabpanel"
            aria-labelledby={`tab-${e.slug}`}
            hidden={k !== i}
            className={styles.panel}
          >
            <h2 className={styles.entryTitle} data-spec={`${spec}.1`}>
              {e.title}
            </h2>
            {e.when && <p className={styles.when}>{e.when}</p>}
            {e.images.length > 0 && (
              <ul className={styles.photos} data-spec={`${spec}.2`}>
                {e.images.map((m, n) => (
                  <li key={n} className={styles.photo}>
                    <Image src={m.url} alt={m.alt} fill sizes="(max-width: 767px) 80vw, 480px" className={styles.cover} />
                  </li>
                ))}
              </ul>
            )}
            <div data-spec={`${spec}.3`}>{bodies[k]}</div>
          </section>
        ))}
      </div>
    </div>
  )
}
