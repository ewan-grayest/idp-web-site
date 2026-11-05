import type { Metadata } from 'next'
import Image from 'next/image'

import styles from '@/components/collection/Collection.module.css'
import { TagFilter } from '@/components/collection/TagFilter'
import base from '@/components/project/Project.module.css'
import { EnquireButton } from '@/components/shared/EnquireButton'
import { Rise } from '@/components/shared/Rise'
import { Link } from '@/i18n/Link'
import { getT } from '@/i18n/server'
import { getCollection } from '@/lib/projects'
import { pages, projectKinds, type ProjectKind } from '@/lib/routes'

export async function collectionMetadata(kind: ProjectKind): Promise<Metadata> {
  const t = await getT()
  return { title: t.pages[projectKinds[kind].collection] }
}

/**
 * Pages 7 (residential), 9 (public) and 17 (product design, the ID Lab page) list all projects of their kind: one template.
 * Section IDs follow page 7 of the spec; 7.1–7.3 rise as the visitor scrolls. The header 0.1.2 keeps the page name
 * («Жилые интерьеры»), not the tag prompt (Ewan, 2026-10-26).
 */
export async function CollectionPage({ kind, tags: tagsParam }: { kind: ProjectKind; tags: string | string[] | undefined }) {
  const t = await getT()
  const { total, cards, tags, picked, maxTags } = await getCollection(kind, tagsParam)
  const pageId = projectKinds[kind].collection
  const path = pages[pageId].path
  const p = t.projects

  return (
    <article className={base.page} data-spec={String(pageId)}>
      <Rise>
        <section className={`${base.sec} ${base.pad}`} data-header-title={t.pages[pageId]} data-spec="7.1">
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

        <section className={`${base.sec} ${base.pad}`} data-spec="7.2">
          <div className={styles.gridHead}>
            <h2 className={base.h2} data-spec="7.2.1">
              {p.more}
            </h2>
            {total > 0 && <span className={styles.count}>{picked.length ? p.found(cards.length) : p.all(total)}</span>}
          </div>
          {cards.length > 0 ? (
            <div className={styles.salon}>
              {/* 7.2 as a salon hang («шпалерная раскладка», Ewan, 2026-10-28): see Collection.module.css */}
              <ul className={styles.grid} data-salon>
                {cards.map((c) => (
                  <li key={c.key} data-shape={c.ratio && c.ratio >= 1.05 ? 'tall' : undefined}>
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
            </div>
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
