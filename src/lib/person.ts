import { getPayload } from 'payload'
import config from '@payload-config'

import { getLocale } from '@/i18n/server'
import type { Person, Project, Tag } from '@/payload-types'
import type { TimelineEvent } from '@/components/shared/Timeline'
import { mediaUrl, projectPath, tagPath, tagsOf } from './projects'

export async function getPerson(slug: string): Promise<Person | null> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({ collection: 'people', locale: await getLocale(), where: { slug: { equals: slug } }, depth: 2, limit: 1 })
  return docs[0] ?? null
}

/** 4.2 achievements, in the shared timeline shape. */
export const personEvents = (p: Person): TimelineEvent[] =>
  (p.achievements ?? []).map((a, k) => {
    const project = typeof a.project === 'object' ? (a.project as Project | null) : null
    return {
      key: a.id ?? String(k),
      date: a.date,
      title: a.title ?? '',
      text: a.text,
      image: mediaUrl(a.image, 'thumb'),
      link: project ? projectPath(project.kind, project.slug) : null,
    }
  })

export type PersonProject = { key: string; title: string; summary: string; href: string; image?: string }

/**
 * 4.3: projects this person led or worked on, newest first (4.3.2),
 * and the tags of those projects plus the person's own (4.3.3). Each tag opens the matching projects collection.
 */
export async function getPersonProjects(p: Person) {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'projects',
    locale: await getLocale(),
    where: { or: [{ leadAuthor: { equals: p.id } }, { authors: { contains: p.id } }] },
    sort: '-createdAt',
    depth: 1,
    limit: 48,
  })

  const projects: PersonProject[] = docs.map((d) => ({
    key: d.slug,
    title: d.title ?? '',
    summary: d.summary ?? '',
    href: projectPath(d.kind, d.slug),
    image: mediaUrl(d.cover, 'thumb') ?? mediaUrl(d.gallery?.[0]?.image, 'thumb'),
  }))

  // A tag links to the collection of the first project that carries it; the person's own tags default to residential
  const tags = new Map<string, { title: string; href: string }>()
  for (const d of docs) for (const t of tagsOf(d)) if (!tags.has(t.slug)) tags.set(t.slug, { title: t.title ?? '', href: tagPath(d.kind, t) })
  for (const t of (p.tags ?? []).filter((t): t is Tag => typeof t === 'object' && t !== null))
    if (!tags.has(t.slug)) tags.set(t.slug, { title: t.title ?? '', href: tagPath('residential', t) })

  return { projects, tags: [...tags.entries()].map(([key, t]) => ({ key, ...t })) }
}
