import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Recommendations } from '@/components/project/Recommendations'
import { Author } from '@/components/project/Author'
import { Share } from '@/components/project/Share'
import { Stage } from '@/components/project/Stage'
import { Strip } from '@/components/project/Strip'
import styles from '@/components/project/Project.module.css'
import { EnquireButton } from '@/components/shared/EnquireButton'
import { Rise } from '@/components/shared/Rise'
import { Timeline } from '@/components/shared/Timeline'
import { Link } from '@/i18n/Link'
import { localePath } from '@/i18n/locales'
import { getLocale, getT } from '@/i18n/server'
import { getProject, getRecommendations, mediaUrl, tagPath, tagsOf, toPhotos } from '@/lib/projects'
import { pages, projectKinds, projectPath, type ProjectKind } from '@/lib/routes'
import { shortPath } from '@/lib/shortCode'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ kind: string; slug: string }> }

const isKind = (k: string): k is ProjectKind => k in projectKinds

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { kind, slug } = await params
  const p = isKind(kind) ? await getProject(kind, slug) : null
  if (!p) return {}
  const image = mediaUrl(p.cover) ?? mediaUrl(p.gallery?.[0]?.image)
  return {
    title: p.title ?? undefined,
    description: p.summary ?? undefined,
    openGraph: { title: p.title ?? undefined, description: p.summary ?? undefined, images: image ? [image] : undefined },
  }
}

/**
 * Pages 5 (residential), 8 (public) and 16 (archive) project details: one template.
 * Section IDs follow page 5 of the spec. Public projects add the price enquiry 5.7.5.
 */
export default async function ProjectPage({ params }: Params) {
  const { kind, slug } = await params
  if (!isKind(kind)) notFound()
  const project = await getProject(kind, slug)
  if (!project) notFound()

  const locale = await getLocale()
  const t = await getT()
  const pageId = projectKinds[kind].detail
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  // Shared links open the page in the language it was shared from
  const url = site + localePath(locale, projectPath(kind, slug))
  const title = project.title ?? ''
  const entity = { type: 'project' as const, ref: slug }
  const recs = await getRecommendations(project)
  const achievements = (project.achievements ?? []).map((a) => ({
    key: a.id ?? a.date,
    date: a.date,
    title: a.title ?? '',
    text: a.text,
    image: mediaUrl(a.image, 'thumb'),
    link: a.link,
  }))
  const stages = [
    { spec: '5.4', title: t.project.stages.concept, data: project.concept },
    { spec: '5.5', title: t.project.stages.preview, data: project.preview },
    { spec: '5.6', title: t.project.stages.process, data: project.process },
  ]

  return (
    <article className={styles.page} data-spec={String(pageId)}>
      <Rise>
        <Strip photos={toPhotos(project.gallery, title)} kindLabel={t.kinds[kind]} title={title} />

        <Author project={project} />

        {(tagsOf(project).length > 0 || (project.authors ?? []).length > 0) && (
          <section className={`${styles.sec} ${styles.pad}`} data-spec="5.3">
            <div className={styles.tags} data-spec="5.3.1">
              {tagsOf(project).map((t) => (
                <Link key={t.id} href={tagPath(kind, t)} className={styles.tag}>
                  {t.title}
                </Link>
              ))}
            </div>
            {(project.authors ?? []).length > 0 && (
              <Link href={`${pages[3].path}?project=${encodeURIComponent(slug)}#team`} className={styles.textLink} data-spec="5.3.2">
                {t.project.team}
              </Link>
            )}
          </section>
        )}

        {stages.map((s, k) => (
          <Stage key={s.spec} spec={s.spec} title={s.title} photos={toPhotos(s.data?.photos, `${title} · ${s.title}`)} text={s.data?.text} flip={k % 2 === 1} />
        ))}

        <section className={`${styles.sec} ${styles.pad}`} data-spec="5.7">
          <Share title={title} url={url} shortUrl={project.shortCode ? site + localePath(locale, shortPath(project.shortCode)) : undefined} />
          {kind === 'public' && (
            <div className={styles.priceRow} data-spec="5.7-b">
              <EnquireButton label={t.project.price} spec="5.7.5" context={t.project.priceContext(title)} entity={entity} />
            </div>
          )}
        </section>

        {achievements.length > 0 && (
          <section className={`${styles.sec} ${styles.pad}`} data-header-title={t.project.achievements} data-spec="5.8">
            <h2 className={styles.h2}>{t.project.achievements}</h2>
            <Timeline events={achievements} spec="5.8.1" />
          </section>
        )}

        <section className={`${styles.sec} ${styles.ctaRow}`} data-spec="5.10">
          <EnquireButton label={t.project.learnMore} spec="5.10.1" context={t.project.learnMoreContext(title)} entity={entity} />
        </section>

        {recs.length > 0 && <Recommendations items={recs} />}
      </Rise>
    </article>
  )
}
