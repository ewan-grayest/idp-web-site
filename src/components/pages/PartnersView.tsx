'use client'

import Image from 'next/image'
import { useCallback, useState } from 'react'

import { EnquireButton } from '@/components/shared/EnquireButton'
import { useI18n } from '@/i18n/client'
import { Link } from '@/i18n/Link'
import type { CollectionCard } from '@/lib/projects'
import type { ProjectKind } from '@/lib/routes'
import styles from './Pages.module.css'
import { useHashPick } from './useHashPick'

export type PartnerHead = {
  slug: string
  name: string
  logo?: string
  link?: string
  photo?: string
  discount: string
  projects: (CollectionCard & { kind: ProjectKind })[]
  tags: { slug: string; title: string }[]
}

/**
 * Page 6.2–6.4: logo buttons 6.2.2 pick a partner; its block 6.3 and projects 6.4 show below.
 * The address keeps the partner (/partners#slug), which the shopping hotspots 5.1.3 and logo tiles 3.7.2 link to;
 * such a link opens straight at the partner's block, under which a clear link leads up to the Get-Together scheme 6.1.
 */
export function PartnersView({ partners, texts }: { partners: PartnerHead[]; texts: React.ReactNode[] }) {
  const { t } = useI18n()
  const [i, setI] = useState(0)

  // Arriving from a product on a photo (/partners#slug): show that partner, not the top of the page
  const fromAddress = useCallback((k: number) => {
    setI(k)
    requestAnimationFrame(() => document.getElementById('partner')?.scrollIntoView({ block: 'start' }))
  }, [])
  useHashPick(partners.map((x) => x.slug), fromAddress)

  function pick(k: number) {
    setI(k)
    history.replaceState(null, '', `#${partners[k].slug}`)
    document.getElementById('partner')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const p = partners[i]
  return (
    <>
      <section className={styles.stack} data-header-title={t.partners.our} data-spec="6.2">
        <h2 className={styles.entryTitle} data-spec="6.2.1">
          {t.partners.our}
        </h2>
        <div className={styles.logos} role="tablist" aria-label={t.partners.our}>
          {partners.map((x, k) => (
            <button
              key={x.slug}
              type="button"
              role="tab"
              aria-selected={k === i}
              aria-controls="partner"
              className={styles.logoBtn}
              onClick={() => pick(k)}
              aria-label={x.logo ? x.name : undefined}
              data-spec="6.2.2"
            >
              {x.logo ? <Image src={x.logo} alt="" fill sizes="200px" /> : x.name}
            </button>
          ))}
        </div>
      </section>

      {p && (
        <section id="partner" role="tabpanel" className={styles.panels} data-header-title={p.name} data-spec="6.3">
          <div className={styles.partner}>
            <div className={styles.partnerText}>
              <h2 className={styles.entryTitle} data-spec="6.3.1">
                {p.name}
              </h2>
              {p.logo && (
                <span className={styles.partnerLogo} data-spec="6.3.2">
                  <Image src={p.logo} alt="" fill sizes="160px" />
                </span>
              )}
              <div data-spec="6.3.3">{texts[i]}</div>
              {p.discount && (
                <p className={styles.discount} data-spec="6.3.6">
                  <span>{t.partners.discount}</span>
                  {p.discount}
                </p>
              )}
              <a href="#get-together" className={styles.gtLink} data-gt-link>
                <span className={styles.gtTitle}>{t.partners.heading}</span>
                <span className={styles.gtNote}>{t.partners.gtLink}</span>
              </a>
              <div className={styles.actions}>
                <EnquireButton
                  label={t.partners.how}
                  spec="6.3.4"
                  context={t.partners.howContext(p.name)}
                  entity={{ type: 'partner', ref: p.slug }}
                />
                {p.link && (
                  <a href={p.link} target="_blank" rel="noopener" className={styles.link}>
                    {t.partners.site} ↗
                  </a>
                )}
              </div>
            </div>
            {p.photo && (
              <div className={styles.partnerPhoto} data-spec="6.3.5">
                <Image src={p.photo} alt="" fill sizes="(max-width: 1023px) 100vw, 55vw" className={styles.cover} />
              </div>
            )}
          </div>

          <div className={`${styles.stack} ${styles.projects}`} data-spec="6.4">
            <h3 className={styles.entryTitle} data-spec="6.4.1">
              {t.partners.projects}
            </h3>
            {p.projects.length ? (
              <ul className={styles.projectGrid} data-spec="6.4.2">
                {p.projects.map((c) => (
                  <li key={c.key}>
                    <Link href={c.href} className={styles.projectCard}>
                      <span className={styles.projectPhoto}>
                        {c.image && <Image src={c.image} alt={c.alt} fill sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw" className={styles.cover} />}
                      </span>
                      <span className={styles.projectKind}>{t.kinds[c.kind]}</span>
                      <span className={styles.projectName}>{c.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.note}>{t.partners.noProjects}</p>
            )}
            {p.tags.length > 0 && (
              <ul className={styles.tags} data-spec="6.4.3">
                {p.tags.map((x) => (
                  <li key={x.slug} className={styles.tag}>
                    {x.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </>
  )
}
