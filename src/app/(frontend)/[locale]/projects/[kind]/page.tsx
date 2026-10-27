import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'

import styles from '@/components/collection/Collection.module.css'
import { TagFilter } from '@/components/collection/TagFilter'
import base from '@/components/project/Project.module.css'
import { EnquireButton } from '@/components/shared/EnquireButton'
import { Rise } from '@/components/shared/Rise'
import { Link } from '@/i18n/Link'
import { getT } from '@/i18n/server'
import { getCollection, maxTags } from '@/lib/projects'
import { pages, projectKinds, type ProjectKind } from '@/lib/routes'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ kind: string }>; searchParams: Promise<{ tags?: string | string[] }> }

const isKind = (k: string): k is ProjectKind => k in projectKinds

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kind } = await params
  if (!isKind(kind)) return {}
  const t = await getT()
  return { title: t.pages[projectKinds[kind].collection] }
}

/**
 * Pages 7 (residential), 9 (public) and 17 (archive) list all projects of their kind: one template.
 * Section IDs follow page 7 of the spec; 7.1–7.3 rise as the visitor scrolls. 7.1 names itself in the header 0.1.2.
 */
export default async function CollectionPage({ params, searchParams }: Props) {
  const { kind } = await params
  if (!isKind(kind)) notFound()
  const [{ tags: tagsParam }, t] = await Promise.all([searchParams, getT()])
  const { total, cards, tags, picked } = await getCollection(kind, tagsParam)
  const pageId = projectKinds[kind].collection
  const path = pages[pageId].path
  const p = t.projects

  return (
    <article className={base.page} data-spec={String(pageId)}>
      <Rise>
        <section className={`${base.sec} ${base.pad}`} data-header-title={p.pickTags} data-spec="7.1">
          <div className={styles.head}>
            <h1 className={base.lab}>{t.pages[pageId]}</h1>
            <h2 id="pick-tags" className={base.h2} data-spec="7.1.1">
              {p.pickTags}
            </h2>
          </div>
          {tags.length > 0 ? (
            <TagFilter key={picked.join(',')} tags={tags} initial={picked} path={path} max={maxTags} labelledBy="pick-tags" />
          ) : (
            <p className={styles.note}>{p.noTags}</p>
          )}
        </section>

        <section className={`${base.sec} ${base.pad}`} data-header-title={p.more} data-spec="7.2">
          <div className={styles.gridHead}>
            <h2 className={base.h2} data-spec="7.2.1">
              {p.more}
            </h2>
            {total > 0 && <span className={styles.count}>{picked.length ? p.found(cards.length) : p.all(total)}</span>}
          </div>
          {cards.length > 0 ? (
            <ul className={styles.grid}>
              {cards.map((c) => (
                <li key={c.key}>
                  <Link href={c.href} className={styles.card} data-spec="7.2.2">
                    {c.image ? (
                      <Image src={c.image} alt={c.alt} fill sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw" className={base.cover} />
                    ) : (
                      <span className={styles.noImage}>{c.title}</span>
                    )}
                    <span className={styles.overlay} data-spec="7.2.3">
                      <span data-spec="7.2.4">{c.title}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : total > 0 ? (
            <div className={styles.none}>
              <p className={styles.note}>{p.none}</p>
              <Link href={path} className={base.textLink} scroll={false}>
                {p.resetFilter}
              </Link>
            </div>
          ) : (
            <p className={styles.note}>{p.empty}</p>
          )}
        </section>

        <section className={`${base.sec} ${base.ctaRow}`} data-spec="7.3">
          <EnquireButton
            label={p.learnMore}
            spec="7.3.1"
            context={`${p.learnMore} · ${t.pages[pageId]}`}
            entity={{ type: 'page', ref: `projects-${kind}` }}
          />
        </section>
      </Rise>
    </article>
  )
}
