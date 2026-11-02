import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'

import person from '@/components/person/Person.module.css'
import base from '@/components/project/Project.module.css'
import { EnquireButton } from '@/components/shared/EnquireButton'
import { Rise } from '@/components/shared/Rise'
import { SocialFeed } from '@/components/shared/SocialFeed'
import { Timeline } from '@/components/shared/Timeline'
import { Link } from '@/i18n/Link'
import { getT } from '@/i18n/server'
import { getPerson, getPersonProjects, personEvents } from '@/lib/person'
import { mediaUrl } from '@/lib/projects'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = await getPerson((await params).slug)
  if (!p) return {}
  const image = mediaUrl(p.photo, 'wide') ?? mediaUrl(p.portrait, 'wide')
  return {
    title: p.name ?? undefined,
    description: [p.role, p.quote].filter(Boolean).join('. ') || undefined,
    openGraph: { title: p.name ?? undefined, images: image ? [image] : undefined },
  }
}

/**
 * Page 4 · Person. Sections 4.1–4.4 rise and overlap like the rest of the site.
 * The name 4.1.3 is the header title 0.1.2, then each section names itself. 4.5 (Instagram) was dropped.
 */
export default async function PersonPage({ params }: Params) {
  const p = await getPerson((await params).slug)
  if (!p) notFound()

  const photo = mediaUrl(p.photo, 'panorama') ?? mediaUrl(p.portrait, 'wide')
  const events = personEvents(p)
  const { projects, tags } = await getPersonProjects(p)
  const t = await getT()

  return (
    <article className={base.page} data-spec="4">
      <Rise>
        <section className={`${base.sec} ${base.author}`} data-header-title={p.name} data-spec="4.1">
          <div className={base.portrait} data-spec="4.1.1">
            {photo ? <Image src={photo} alt="" fill sizes="100vw" priority className={base.cover} /> : <PhotoPlaceholder />}
          </div>
          <div className={base.authorPanel}>
            {p.role && (
              <span className={base.lab} style={{ color: 'var(--c-text)' }} data-spec="4.1.2">
                {p.role}
              </span>
            )}
            <h1 className={person.h1} data-spec="4.1.3">
              {p.name}
            </h1>
            {p.quote && (
              <blockquote className={base.quote} data-spec="4.1.4">
                {t.common.quote(p.quote)}
              </blockquote>
            )}
            {p.interests && (
              <div className={base.about} data-spec="4.1.5">
                <span className={base.lab}>{t.person.interests}</span>
                <p>{p.interests}</p>
              </div>
            )}
          </div>
        </section>

        {events.length > 0 && (
          <section id="achievements" className={`${base.sec} ${base.pad}`} data-header-title={t.person.achievements} data-spec="4.2">
            <h2 className={base.h2} data-spec="4.2.1">
              {t.person.achievements}
            </h2>
            <Timeline events={events} spec="4.2.2" />
          </section>
        )}

        {(projects.length > 0 || tags.length > 0) && (
          <section className={`${base.sec} ${person.projSec}`} data-header-title={t.person.projects} data-spec="4.3">
            <h2 className={base.h2} data-spec="4.3.1">
              {t.person.projects}
            </h2>
            {projects.length > 0 && (
              <ul className={person.projects}>
                {projects.map((pr) => (
                  <li key={pr.key}>
                    <Link href={pr.href} className={person.proj} data-spec="4.3.2">
                      {pr.image && <Image src={pr.image} alt="" fill sizes="400px" className={person.cover} />}
                      <span className={person.projText}>
                        <span className={person.projTitle}>{pr.title}</span>
                        {pr.summary && <span className={person.projSummary}>{pr.summary}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {tags.length > 0 && (
              <div className={person.tags}>
                {tags.map((t) => (
                  <Link key={t.key} href={t.href} className={base.tag} data-spec="4.3.3">
                    {t.title}
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        <section className={`${base.sec} ${base.ctaRow}`} data-spec="4.4">
          <EnquireButton
            label={t.person.ask}
            spec="4.4.1"
            context={t.person.askContext(p.name ?? '')}
            entity={{ type: 'person', ref: p.slug }}
          />
        </section>
        <SocialFeed scope="person" entity={p.id} hashtag={p.socialHashtag} spec="4.5" />
      </Rise>
    </article>
  )
}

function PhotoPlaceholder() {
  return (
    <svg className={base.cover} viewBox="0 0 1440 640" preserveAspectRatio="xMidYMid slice" aria-hidden style={{ background: 'var(--c-photo-ph)', color: 'var(--c-text)' }}>
      <circle cx="400" cy="250" r="110" fill="currentColor" opacity="0.12" />
      <path d="M220 640c0-140 80-230 180-230s180 90 180 230" fill="currentColor" opacity="0.12" />
    </svg>
  )
}
