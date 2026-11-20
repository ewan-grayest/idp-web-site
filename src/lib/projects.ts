import { getPayload, type Where } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'

import { dictionaries } from '@/i18n/dictionaries'
import { getLocale } from '@/i18n/server'
import type { Media, Partner, Person, Project, Tag } from '@/payload-types'
import { objectPosition } from './crops'
import { filterTags, photoTags, shownPhotoTags, shownTagIds } from './photoTags'
import { pages, personPath, projectKinds, projectPath, type ProjectKind } from './routes'
import { getSettings } from './settings'
import { selectTags } from './limits'
import { asVisitor } from './published'

/** A photo ready for the page: the image plus its shopping hotspots (5.1.3). */
export type Photo = {
  url: string
  thumb: string
  /** The file as uploaded, at `width` × `height` */
  original: string
  alt: string
  width: number
  height: number
  /** `object-position` around the photo's focal point, for every box that crops it (lib/crops.ts) */
  focus?: string
  /** All the photo's tags, for search engines (lib/photoTags.ts) */
  keywords: string[]
  /** The tags shown under the photo in the viewer, each opening the projects with it; empty unless the file says so */
  tags: { key: number; title: string; href: string }[]
  /** `name`: what it is (sofa, lamp…); `shop`: the partner selling it; no `href` when no partner is picked yet */
  hotspots: { name: string; shop: string; href?: string; logo?: string; x: number; y: number }[]
}

type PhotoRow = NonNullable<Project['gallery']>[number]

const isObj = <T extends object>(v: number | T | null | undefined): v is T => typeof v === 'object' && v !== null

export function mediaUrl(m: Media | number | null | undefined, size: 'thumb' | 'wide' | 'panorama' = 'wide') {
  if (!isObj(m)) return undefined
  return m.sizes?.[size]?.url || m.url || undefined
}

/** The first of these that is a file the page can show, for a photo with a fallback (a person's wide photo, else the portrait). */
export const pickMedia = (...ms: (Media | number | null | undefined)[]): Media | undefined => ms.find((m): m is Media => isObj(m) && !!m.url)

/** Where a box crops this photo: `object-position` around its focal point, undefined for the centre (lib/crops.ts). */
export const mediaFocus = (m: Media | number | null | undefined) => objectPosition(m)

/** Partner hotspots open the partner on the Partners page (6). */
export const partnerPath = (p: Partner) => `${pages[6].path}#${p.slug}`

/** Photo descriptions are optional: an empty one falls back to the name shown on the page. */
export const altOr = (alt: string | null | undefined, fallback: string) => alt?.trim() || fallback

/** `kind`: the project's, so a photo's tags open the list of its kind; without it the viewer shows no tags. */
export function toPhotos(rows: PhotoRow[] | null | undefined, fallbackAlt: string, kind?: ProjectKind): Photo[] {
  return (rows ?? []).flatMap((row) => {
    const m = row.image
    if (!isObj(m) || !m.url) return []
    return [
      {
        url: mediaUrl(m, 'panorama') ?? m.url,
        thumb: mediaUrl(m, 'thumb') ?? m.url,
        original: m.url,
        alt: altOr(m.alt, fallbackAlt),
        width: m.width ?? 1600,
        height: m.height ?? 1000,
        focus: objectPosition(m),
        keywords: photoTags(m).map((t) => t.title?.trim() ?? '').filter(Boolean),
        tags: kind ? shownPhotoTags(m).map((t) => ({ key: t.id, title: t.title?.trim() || t.slug, href: tagPath(kind, t) })) : [],
        hotspots: (row.hotspots ?? []).flatMap((h) => {
          // A product needs a place on the photo and something to say: its name, its partner or both.
          // Without a partner it shows as a name only, with no shop link (Ewan, 2026-10-27)
          const partner = isObj(h.partner) ? h.partner : undefined
          const name = h.label?.trim() || partner?.name || ''
          if (typeof h.x !== 'number' || typeof h.y !== 'number' || !name) return []
          return [{ name, shop: h.label?.trim() ? partner?.name || '' : '', href: partner && partnerPath(partner), logo: partner && mediaUrl(partner.logo, 'thumb'), x: h.x, y: h.y }]
        }),
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

/**
 * Texts come in the page's language; untranslated ones fall back to Russian.
 * An unpublished project opens only for signed-in staff, so «Предпросмотр» in the admin still works (Ewan, 2026-11-05).
 */
export async function getProject(kind: ProjectKind, slug: string): Promise<Project | null> {
  const payload = await getPayload({ config })
  const query = {
    ...asVisitor,
    collection: 'projects',
    locale: await getLocale(),
    where: { slug: { equals: slug }, kind: { equals: kind } },
    depth: 2,
    limit: 1,
  } as const
  const { docs } = await payload.find(query)
  if (docs[0]) return docs[0]
  // Only a miss pays for reading the session
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return null
  return (await payload.find({ ...query, user })).docs[0] ?? null
}

/** `ratio`: the cover's height to width, so the salon grid (7.2) gives an upright photo an upright frame */
export type CollectionCard = { key: number; title: string; href: string; image?: string; focus?: string; alt: string; ratio?: number }

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
    focus: mediaFocus(image),
    // The card shows the name already (7.2.4): an empty description keeps screen readers from repeating it
    alt: (isObj(image) && image.alt?.trim()) || '',
    ratio: isObj(image) && image.width && image.height ? image.height / image.width : undefined,
  }
}

/**
 * Pages 7, 9 and 17: every project of one kind, newest first, and the tags they use (7.1.2).
 * `?tags=a,b` keeps the projects that carry all picked tags (ASSUMPTION: AND, so each tag narrows the list).
 * Unknown slugs are ignored; more than five are cut to the first five.
 */
export async function getCollection(kind: ProjectKind, tagsParam: string | string[] | undefined) {
  const { limits } = await getSettings()
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    ...asVisitor,
    collection: 'projects',
    locale: await getLocale(),
    where: { kind: { equals: kind } },
    sort: '-createdAt',
    depth: 1,
    pagination: false,
  })

  // A project carries its own tags and those its photos show (lib/photoTags.ts). Photos come one level deep, so
  // their tags are ids: the ones no project names are read here
  const byId = new Map<number, Tag>()
  for (const p of docs) for (const t of tagsOf(p)) byId.set(t.id, t)
  const missing = [...new Set(docs.flatMap(shownTagIds))].filter((id) => !byId.has(id))
  if (missing.length) {
    const found = await payload.find({ ...asVisitor, collection: 'tags', locale: await getLocale(), where: { id: { in: missing } }, depth: 0, pagination: false })
    for (const t of found.docs) byId.set(t.id, t)
  }
  const tagsByProject = new Map(docs.map((p) => [p.id, filterTags(p, byId)]))

  const tags = new Map<string, Tag>()
  for (const p of docs) for (const t of tagsByProject.get(p.id)!) tags.set(t.slug, t)
  const available = [...tags.values()].sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''))

  const picked = selectTags(tagsParam, [...tags.keys()], limits.maxTags)

  const cards: CollectionCard[] = docs
    .filter((p) => picked.every((slug) => tagsByProject.get(p.id)!.some((t) => t.slug === slug)))
    .map(toCard)

  return {
    total: docs.length,
    cards,
    tags: available.map((t) => ({ slug: t.slug, title: t.title ?? t.slug })),
    picked,
    maxTags: limits.maxTags,
  }
}

export type Recommendation = { key: string; badge: string; spec: string; title: string; href: string; image?: string; focus?: string }

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
      const { docs } = await payload.find({ ...asVisitor, collection: 'projects', locale, where: { and: where }, sort: '-updatedAt', limit: 1, depth: 1 })
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
    image: mediaUrl(coverOf(doc)),
    focus: mediaFocus(coverOf(doc)),
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
