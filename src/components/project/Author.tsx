import Image from 'next/image'

import { Link } from '@/i18n/Link'
import { getT } from '@/i18n/server'
import type { Project } from '@/payload-types'
import { mediaUrl, personOf, personPath } from '@/lib/projects'
import styles from './Project.module.css'

/** 5.2 author: full-width portrait 5.2.1, role 5.2.2, name 5.2.3 (both open the Person page), quote 5.2.4, summary 5.2.5. */
export async function Author({ project }: { project: Project }) {
  const person = personOf(project.leadAuthor)
  if (!person && !project.summary && !project.quote) return null
  const t = await getT()
  const href = person ? personPath(person.slug) : undefined
  const portrait = mediaUrl(person?.photo, 'panorama') ?? mediaUrl(person?.portrait, 'panorama')

  return (
    <section className={`${styles.sec} ${styles.author}`} data-header-title={project.title || t.project.about} data-spec="5.2">
      {href ? (
        <Link href={href} className={styles.portrait} aria-label={t.project.openPerson(person!.name ?? '')} data-spec="5.2.1">
          {portrait ? <Image src={portrait} alt="" fill sizes="100vw" className={styles.cover} /> : <PortraitPlaceholder />}
        </Link>
      ) : (
        <div className={styles.portrait}>
          <PortraitPlaceholder />
        </div>
      )}
      <div className={styles.authorPanel}>
        {person && (
          <>
            <span className={styles.lab} style={{ color: 'var(--c-light)' }} data-spec="5.2.2">
              {project.leadRole || t.project.leadRole}
            </span>
            <Link href={href!} className={styles.name} data-spec="5.2.3">
              {person.name}
            </Link>
          </>
        )}
        {project.summary && (
          <div className={styles.about} data-spec="5.2.5">
            <span className={styles.lab}>{t.project.about}</span>
            <p>{project.summary}</p>
          </div>
        )}
        {project.quote && (
          <blockquote className={styles.quote} data-spec="5.2.4">
            {t.common.quote(project.quote)}
          </blockquote>
        )}
      </div>
    </section>
  )
}

function PortraitPlaceholder() {
  return (
    <svg className={styles.cover} viewBox="0 0 1440 640" preserveAspectRatio="xMidYMid slice" aria-hidden style={{ background: '#24272a' }}>
      <circle cx="360" cy="250" r="110" fill="#33373b" />
      <path d="M180 640c0-140 80-230 180-230s180 90 180 230" fill="#33373b" />
    </svg>
  )
}
