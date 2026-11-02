'use client'

import Image from 'next/image'
import { useState } from 'react'

import { CloseIcon } from '@/components/shell/Icons'
import { useI18n } from '@/i18n/client'
import { Link } from '@/i18n/Link'
import type { Member } from '@/lib/studio'
import styles from './Studio.module.css'

/**
 * 3.2 team strip. Any number of people scroll sideways (3.2.2 photo, 3.2.3 name and role).
 * Choosing someone opens 3.2-a beside the strip (below it on phones): the full photo 3.2.4 at half
 * the page width, close 3.2.5, name and role 3.2.6 and their "smart thought" 3.2.7.
 * The photo and the name both lead to the Person page 4.
 */
export function TeamStrip({ members }: { members: Member[] }) {
  const { t } = useI18n()
  const [open, setOpen] = useState<number | null>(null)
  const m = open === null ? null : members[open]

  return (
    <div className={styles.team} data-open={m ? '' : undefined}>
      <ul className={styles.people} aria-label={t.studio.staff}>
        {members.map((p, k) => (
          <li key={p.slug}>
            <button
              type="button"
              className={styles.person}
              aria-pressed={k === open}
              aria-controls="team-card"
              onClick={() => setOpen(k === open ? null : k)}
              data-spec="3.2.2"
            >
              <span className={styles.circle}>
                {p.thumb ? <Image src={p.thumb} alt="" fill sizes="200px" className={styles.cover} /> : <Silhouette />}
              </span>
              <span className={styles.who} data-spec="3.2.3">
                <span className={styles.pname}>{p.name}</span>
                {p.role && <span className={styles.prole}>{p.role}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {m && (
        <div id="team-card" className={styles.card} role="region" aria-label={m.name} data-spec="3.2-a">
          <Link href={m.href} className={styles.cardPhoto} tabIndex={-1} aria-hidden data-spec="3.2.4">
            {m.photo ? <Image src={m.photo} alt="" fill sizes="(max-width: 767px) 100vw, 50vw" className={styles.cover} /> : <Silhouette />}
          </Link>
          <button type="button" className={styles.close} aria-label={t.common.close} onClick={() => setOpen(null)} data-spec="3.2.5">
            <CloseIcon />
          </button>
          <div className={styles.cardText}>
            {m.quote && (
              <blockquote className={styles.thought} data-spec="3.2.7">
                {t.common.quote(m.quote)}
              </blockquote>
            )}
            <Link href={m.href} className={styles.cardName} data-spec="3.2.6">
              {m.name}
              {m.role && ` · ${m.role}`}
            </Link>
            {m.achievements > 0 && (
              <Link href={`${m.href}#achievements`} className={styles.cardMore} data-team-achievements>
                {t.person.achievements} ({m.achievements}) →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Silhouette() {
  return (
    <svg className={styles.cover} viewBox="0 0 100 100" preserveAspectRatio="xMidYMax meet" aria-hidden style={{ background: 'var(--c-photo-ph)' }}>
      <circle cx="50" cy="40" r="17" fill="currentColor" opacity="0.18" />
      <path d="M18 100c0-22 14-36 32-36s32 14 32 36" fill="currentColor" opacity="0.18" />
    </svg>
  )
}
