'use client'

import Image from 'next/image'

import { useI18n } from '@/i18n/client'
import { openEnquiry } from '@/lib/enquire'
import styles from './Studio.module.css'

export type Issue = { key: string; number: number; when: string; title: string; cover?: string; link?: string }

/**
 * 3.4 online journal: covers 3.4.2 scroll sideways, newest on the left; the date and number bar 3.4.3 turns green on hover.
 * The spec's click is "a pop-up, or «Получить экземпляр»": an issue with a link (Joomag etc.) opens the magazine
 * in a new tab and keeps «Получить экземпляр» under the cover; an issue without one opens that enquiry from the cover,
 * with the journal and issue as its context. (Ewan, 2026-10-25: the journal should open, not ask for an e-mail.)
 */
export function Journal({ issues }: { issues: Issue[] }) {
  const { t } = useI18n()
  const getCopy = (i: Issue) =>
    openEnquiry({
      context: t.studio.getCopyContext(i.number, i.when),
      entity: { type: 'page', ref: `issue-${i.number}` },
    })

  return (
    <ul className={styles.issues} aria-label={t.studio.issues}>
      {issues.map((i) => {
        const face = (
          <>
            <span className={styles.issueCover}>
              {i.cover ? (
                <Image src={i.cover} alt="" fill sizes="260px" className={styles.cover} />
              ) : (
                <span className={styles.issueBlank}>{i.title}</span>
              )}
            </span>
            <span className={styles.issueNo} data-spec="3.4.3">
              {t.studio.issue(i.number, i.when)}
              {i.link && <span aria-hidden> ↗</span>}
            </span>
          </>
        )
        return (
          <li key={i.key}>
            {i.link ? (
              <>
                <a
                  href={i.link}
                  target="_blank"
                  rel="noopener"
                  className={styles.issue}
                  aria-label={t.studio.read(i.number, i.when)}
                  data-spec="3.4.2"
                >
                  {face}
                </a>
                <button type="button" className={styles.issueCopy} onClick={() => getCopy(i)} aria-label={t.studio.getCopy(i.number, i.when)}>
                  {t.studio.getCopyShort}
                </button>
              </>
            ) : (
              <button type="button" className={styles.issue} onClick={() => getCopy(i)} aria-label={t.studio.getCopy(i.number, i.when)} data-spec="3.4.2">
                {face}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
