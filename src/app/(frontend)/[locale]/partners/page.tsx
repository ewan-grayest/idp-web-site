import type { Metadata } from 'next'

import { PartnersView } from '@/components/pages/PartnersView'
import styles from '@/components/pages/Pages.module.css'
import base from '@/components/project/Project.module.css'
import { EnquireButton } from '@/components/shared/EnquireButton'
import { Prose } from '@/components/shared/Prose'
import { StudioMap } from '@/components/studio/StudioMap'
import studio from '@/components/studio/Studio.module.css'
import { getT } from '@/i18n/server'
import { getContacts, getPageText, getPartners } from '@/lib/pages'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).pages[6] }
}

/**
 * Page 6 · Partners and the Get-Together bonus scheme: 6.1 the scheme, 6.2–6.4 partners and their projects,
 * 6.5 how to find us, 6.6 «Узнать больше о бонусной системе Get-Together». 6.7 (Instagram feed) was dropped.
 */
export default async function PartnersPage() {
  const [partners, gt, contacts, t] = await Promise.all([getPartners(), getPageText('gt'), getContacts(), getT()])
  const tel = (p: string) => `tel:${p.replace(/[^\d+]/g, '')}`

  return (
    <article className={base.page} data-spec="6">
      <section id="get-together" className={`${base.sec} ${base.pad} ${styles.anchor}`} data-header-title={t.partners.heading} data-spec="6.1">
        <div className={styles.head}>
          <span className={base.lab}>{t.pages[6]}</span>
          <h1 data-spec="6.1.1">{t.partners.heading}</h1>
        </div>
        <div data-spec="6.1.2">
          <Prose data={gt} empty={t.partners.gtEmpty} />
        </div>
      </section>

      <section className={`${base.sec} ${base.pad}`}>
        {partners.length ? (
          <PartnersView
            partners={partners.map(({ text: _text, ...p }) => p)}
            texts={partners.map((p) => <Prose key={p.slug} data={p.text} />)}
          />
        ) : (
          <p className={styles.note}>{t.partners.empty}</p>
        )}
      </section>

      <section className={`${base.sec} ${studio.findSec}`} data-header-title={t.partners.findUs} data-spec="6.5">
        <h2 className={`${base.h2} ${studio.inset}`} data-spec="6.5.1">
          {t.partners.findUs}
        </h2>
        <StudioMap point={contacts.map} title={t.studio.map} />
        <div className={studio.contacts} data-spec="6.5.3">
          <address>{contacts.address}</address>
          <a href={tel(contacts.partnersPhone)}>{contacts.partnersPhone}</a>
          <a href={`mailto:${contacts.partnersEmail}`}>{contacts.partnersEmail}</a>
        </div>
      </section>

      <section className={`${base.sec} ${base.ctaRow}`} data-spec="6.6">
        <EnquireButton label={t.partners.learnGt} spec="6.6.1" context={t.partners.learnGt} entity={{ type: 'page', ref: 'partners' }} />
      </section>
    </article>
  )
}
