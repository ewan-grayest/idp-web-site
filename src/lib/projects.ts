import { getPayload, type Where } from 'payload'
import config from '@payload-config'

import { dictionaries } from '@/i18n/dictionaries'
import { getLocale } from '@/i18n/server'
import type { Media, Partner, Person, Project, Tag } from '@/payload-types'
import { pages, personPath, projectKinds, projectPath, type ProjectKind } from './routes'

/** A photo ready for the page: the image plus its shopping hotspots (5.1.3). */
export type Photo = {
  url: string
  thumb: string
  alt: string
  width: number
  height: number
  /** `name`: what it is (sofa, lamp…); `shop`: the partner selling it */
  hotspots: { name: string; shop: string; href: string; x: number; y: number }[]
}

type PhotoRow = NonNullable<Project['gallery']>[number]

const isObj = <T extends object>(v: number | T | null | undefined): v is T => typeof v === 'object' && v !== null

export function mediaUrl(m: Media | number | null | undefined, size: 'thumb' | 'wide' | 'panorama' = 'wide') {
  if (!isObj(m)) return undefined
  return m.sizes?.[size]?.url || m.url || undefined
}

/** Partner hotspots open the partner on the Partners page (6). */
export const partnerPath = (p: Partner) => `${pages[6].path}#${p.slug}`

/** Photo descriptions are optional: an empty one falls back to the name shown on the page. */
export const altOr = (alt: string | null | undefined, fallback: string) => alt?.trim() || fallback

export function toPhotos(rows: PhotoRow[] | null | undefined, fallbackAlt: string): Photo[] {
  return (rows ?? []).flatMap((row) => {
    const m = row.image
    if (!isObj(m) || !m.url) return []
    return [
      {
        url: mediaUrl(m, 'panorama') ?? m.url,
        thumb: mediaUrl(m, 'thumb') ?? m.url,
        alt: altOr(m.alt, fallbackAlt),
        width: m.width ?? 1600,
        height: m.height ?? 1000,
        // Products still being filled in (no partner or position yet) stay off the page
        hotspots: (row.hotspots ?? []).flatMap((h) =>
          isObj(h.partner) && typeof h.x === 'number' && typeof h.y === 'number'
            ? [{ name: h.label?.trim() || h.partner.name || '', shop: h.label?.trim() ? h.partner.name || '' : '', href: partnerPath(h.partner), x: h.x, y: h.y }]
            : [],
        ),
      },
    ]
  })
}

export const tagsOf = (p: Project): Tag[] => (p.tags ?? []).filter(isObj)
export const personOf = (p: Person | number | null | undefined) => (isObj(p) ? p : undefined)

/** Tag 5.3.1 opens the matching collection page filtered by that tag. */
export const tagPath = (kind: ProjectKind, tag: Tag) =>
  `${pages[projectKinds[kind].collection].path}?tags=${encodeURIComponent(tag.slug)}`

export { personPath, projectPath }

/** Texts come in the page's language; untranslated ones fall back to Russian. */
export async function getProject(kind: ProjectKind, slug: string): Promise<Project | null> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'projects',
    locale: await getLocale(),
    where: { slug: { equals: slug }, kind: { equals: kind } },
    depth: 2,
    limit: 1,
  })
  return docs[0] ?? null
}

/** 7.1.2: a visitor picks at most five tags. */
export const maxTags = 5

export type CollectionCard = { key: number; title: string; href: string; image?: string; alt: string }

/** A project's cover, else its first gallery photo. */
export const coverOf = (p: Project) => (isObj(p.cover) ? p.cover : p.gallery?.find((row) => isObj(row.image))?.image)

/** A project card with its name over the photo (7.2, 6.4.2). */
export function toCard(p: Project): CollectionCard {
  const image = coverOf(p)
  return {
    key: p.id,
    title: p.title ?? '',
    href: projectPath(p.kind, p.slug),
    image: mediaUrl(image),
    // The card shows the name already (7.2.4): an empty description keeps screen readers from repeating it
    alt: (isObj(image) && image.alt?.trim()) || '',
  }
}

/**
 * Pages 7, 9 and 17: every project of one kind, newest first, and the tags they use (7.1.2).
 * `?tags=a,b` keeps the projects that carry all picked tags (ASSUMPTION: AND, so each tag narrows the list).
 * Unknown slugs are ignored; more than five are cut to the first five.
 */
export async function getCollection(kind: ProjectKind, tagsParam: string | string[] | undefined) {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'projects',
    locale: await getLocale(),
    where: { kind: { equals: kind } },
    sort: '-createdAt',
    depth: 1,
    pagination: false,
  })

  const tags = new Map<string, Tag>()
  for (const p of docs) for (const t of tagsOf(p)) tags.set(t.slug, t)
  const available = [...tags.values()].sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''))

  const asked = [tagsParam ?? []].flat().flatMap((v) => v.split(','))
  const picked = [...new Set(asked.map((s) => s.trim()).filter((s) => tags.has(s)))].slice(0, maxTags)

  const cards: CollectionCard[] = docs
    .filter((p) => picked.every((slug) => tagsOf(p).some((t) => t.slug === slug)))
    .map(toCard)

  return {
    total: docs.length,
    cards,
    tags: available.map((t) => ({ slug: t.slug, title: t.title ?? t.slug })),
    picked,
  }
}

export type Recommendation ={ key: string; badge: string; spec: string; title: string; href: string; image?: string }

/**
 * 5.11: up to three cards.
 * 5.11.2 next stage of this project ("Скоро"), 5.11.3 a similar project of the same kind,
 * 5.11.4 a project of the other kind (residential ↔ public). Similar = shares a tag; falls back to newest.
 */
export async function getRecommendations(p: Project): Promise<Recommendation[]> {
  const payload = await getPayload({ config })
  const locale = await getLocale()
  const badges = dictionaries[locale].project.badges
  const tagIds = tagsOf(p).map((t) => t.id)
  const otherKind: ProjectKind = p.kind === 'public' ? 'residential' : 'public'
  const taken = new Set<number>([p.id])

  async function pick(kind: ProjectKind): Promise<Project | undefined> {
    const base: Where[] = [{ kind: { equals: kind } }, { id: { not_in: [...taken] } }]
    for (const where of tagIds.length ? [[...base, { tags: { in: tagIds } }], base] : [base]) {
      const { docs } = await payload.find({ collection: 'projects', locale, where: { and: where }, sort: '-updatedAt', limit: 1, depth: 1 })
      if (docs[0]) {
        taken.add(docs[0].id)
        return docs[0]
      }
    }
  }

  const card = (doc: Project, badge: string, spec: string): Recommendation => ({
    key: `${spec}-${doc.id}`,
    badge,
    spec,
    title: doc.title ?? '',
    href: projectPath(doc.kind, doc.slug),
    image: mediaUrl(doc.cover) ?? mediaUrl(doc.gallery?.[0]?.image),
  })

  const out: Recommendation[] = []
  if (isObj(p.nextStage)) {
    taken.add(p.nextStage.id)
    out.push(card(p.nextStage, badges.soon, '5.11.2'))
  }
  const similar = await pick(p.kind)
  if (similar) out.push(card(similar, badges.similar, '5.11.3'))
  const other = await pick(otherKind)
  if (other) out.push(card(other, badges[otherKind === 'public' ? 'public' : 'residential'], '5.11.4'))
  return out
}
