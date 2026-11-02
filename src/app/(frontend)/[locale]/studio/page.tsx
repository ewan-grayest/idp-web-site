import type { Metadata } from 'next'
import Image from 'next/image'

import base from '@/components/project/Project.module.css'
import { EnquireButton } from '@/components/shared/EnquireButton'
import { Rise } from '@/components/shared/Rise'
import { Timeline } from '@/components/shared/Timeline'
import { Journal } from '@/components/studio/Journal'
import { mapLink, StudioMap } from '@/components/studio/StudioMap'
import styles from '@/components/studio/Studio.module.css'
import { TeamStrip } from '@/components/studio/TeamStrip'
import { Link } from '@/i18n/Link'
import { getT } from '@/i18n/server'
import { pages } from '@/lib/routes'
import { getContacts } from '@/lib/pages'
import { getStudio, getTeam } from '@/lib/studio'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t.pages[3], description: t.meta.studio }
}

type Props = { searchParams: Promise<{ project?: string; tag?: string }> }

/**
 * Page 3 · Studio and team. Sections 3.1–3.7 rise and overlap as the visitor scrolls,
 * and each one names itself in the header 0.1.2. 3.8 (Instagram feed) was dropped.
 */
export default async function StudioPage({ searchParams }: Props) {
  const filter = await searchParams
  const [{ members, label }, studio, t, { phone, email }] = await Promise.all([getTeam(filter), getStudio(), getT(), getContacts()])

  return (
    <article className={base.page} data-spec="3">
      <Rise>
        <section id="mission" className={`${base.sec} ${styles.mission}`} data-header-title={t.studio.mission} data-spec="3.1">
          <div className={styles.missionHead}>
            <span className={base.lab}>{t.studio.label}</span>
            <h1 data-spec="3.1.1">{t.studio.mission}</h1>
          </div>
          <div className={styles.missionText} data-spec="3.1.2">
            {studio.mission && <p className={styles.lead}>{studio.mission}</p>}
            {studio.vision && <p className={styles.vision}>{studio.vision}</p>}
          </div>
        </section>

        <section id="team" className={`${base.sec} ${styles.teamSec}`} data-header-title={t.studio.team} data-spec="3.2">
          <div className={styles.teamHead}>
            <h2 className={base.h2} data-spec="3.2.1">
              {t.studio.team}
            </h2>
            {label && (
              <span className={styles.filter}>
                {label}
                <Link href={`${pages[3].path}#team`} className={base.textLink}>
                  {t.studio.allTeam}
                </Link>
              </span>
            )}
          </div>
          {members.length > 0 ? (
            <TeamStrip members={members} />
          ) : (
            <p className={base.empty} style={{ padding: '0 10% 56px', margin: 0 }}>
              {t.studio.noTeam}
            </p>
          )}
        </section>

        {studio.history.length > 0 && (
          <section id="history" className={`${base.sec} ${base.pad}`} data-header-title={t.studio.history} data-spec="3.3">
            <h2 className={base.h2} data-spec="3.3.1">
              {t.studio.history}
            </h2>
            <Timeline events={studio.history} spec="3.3.2" />
          </section>
        )}

        {studio.issues.length > 0 && (
          <section id="journal" className={`${base.sec} ${styles.journalSec}`} data-header-title={t.studio.journal} data-spec="3.4">
            <h2 className={base.h2} data-spec="3.4.1">
              {t.studio.journal}
            </h2>
            <Journal issues={studio.issues} />
          </section>
        )}

        <section id="contacts" className={`${base.sec} ${styles.findSec}`} data-header-title={t.studio.findUs} data-spec="3.5">
          <h2 className={`${base.h2} ${styles.inset}`} data-spec="3.5.1">
            {t.studio.findUs}
          </h2>
          <StudioMap point={studio.map} title={t.studio.map} />
          <div className={styles.contacts} data-spec="3.5.3">
            <address>{studio.address}</address>
            <a href={`tel:${phone.replace(/[^\d+]/g, '')}`}>{phone}</a>
            <a href={`mailto:${email}`}>{email}</a>
            <a href={mapLink(studio.map)} target="_blank" rel="noopener">
              {t.studio.openMap}
            </a>
          </div>
        </section>

        <section className={`${base.sec} ${base.ctaRow}`} data-spec="3.6">
          <EnquireButton
            label={t.studio.learnMore}
            spec="3.6.1"
            context={t.studio.learnMore}
            entity={{ type: 'page', ref: 'studio' }}
          />
        </section>

        {studio.partners.length > 0 && (
          <section className={`${base.sec} ${base.pad}`} data-header-title={t.studio.partners} data-spec="3.7">
            <h2 className={base.h2} data-spec="3.7.1">
              {t.studio.partners}
            </h2>
            <div className={styles.partners}>
              {studio.partners.map((p) => (
                <Link key={p.key} href={p.href} className={styles.plogo} aria-label={p.name} data-spec="3.7.2">
                  {p.logo ? <Image src={p.logo} alt="" fill sizes="220px" /> : p.name}
                </Link>
              ))}
            </div>
          </section>
        )}
      </Rise>
    </article>
  )
}
