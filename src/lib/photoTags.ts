/**
 * Tags on photos (Ewan, 2026-11-20). A file in «Фото и видео» can carry the site's shared tags: search engines always get
 * them, as the keywords of the photo in the project page's structured data; visitors see them only when the file's
 * «Показывать теги на сайте» is ticked, under the photo in the full screen viewer, each opening the projects with that
 * tag. So that those links find something, a project's list filter counts the tags its photos show as its own.
 * Pure: the pages' queries are in lib/projects.ts.
 */
import type { Media, Project, Tag } from '@/payload-types'

const isObj = <T extends object>(v: number | T | null | undefined): v is T => typeof v === 'object' && v !== null

type Row = { image?: number | Media | null }

/** Every photo of a project: the strip 5.1 and the stages 5.4–5.6, all of which open the viewer. */
export const photoRowsOf = (p: Project): Row[] => [...(p.gallery ?? []), ...(p.concept?.photos ?? []), ...(p.preview?.photos ?? []), ...(p.process?.photos ?? [])]

/** The photo's tags that are loaded documents, in their order. */
export const photoTags = (m: Media | number | null | undefined): Tag[] => (isObj(m) ? (m.tags ?? []).filter(isObj) : [])

/** The tags a visitor sees on this photo: none unless its «Показывать теги на сайте» is ticked. */
export const shownPhotoTags = (m: Media | number | null | undefined): Tag[] => (isObj(m) && m.showTags ? photoTags(m) : [])

/** The ids of the tags the project's photos show, whether loaded or not (lists read projects one level deep). */
export const shownTagIds = (p: Project): number[] =>
  photoRowsOf(p).flatMap((r) => (isObj(r.image) && r.image.showTags ? (r.image.tags ?? []).map((t) => (isObj(t) ? t.id : t)) : []))

/** A project's tags for the list filter 7.1: its own, then those its photos show, each once. */
export function filterTags(p: Project, byId: ReadonlyMap<number, Tag>): Tag[] {
  const out = new Map<number, Tag>()
  for (const t of p.tags ?? []) if (isObj(t)) out.set(t.id, t)
  for (const id of shownTagIds(p)) {
    const t = byId.get(id)
    if (t && !out.has(id)) out.set(id, t)
  }
  return [...out.values()]
}

/** One photo for search engines: schema.org ImageObject, its keywords from all its tags, shown or not. */
export type ImageLd = { '@type': 'ImageObject'; contentUrl: string; caption?: string; width?: number; height?: number; keywords?: string }

export function imageLd(photo: { url: string; alt?: string; width?: number; height?: number; keywords?: string[] }, site: string): ImageLd {
  const keywords = [...new Set((photo.keywords ?? []).map((k) => k.trim()).filter(Boolean))]
  return {
    '@type': 'ImageObject',
    contentUrl: /^https?:\/\//.test(photo.url) ? photo.url : `${site}${photo.url}`,
    ...(photo.alt ? { caption: photo.alt } : {}),
    ...(photo.width && photo.height ? { width: photo.width, height: photo.height } : {}),
    ...(keywords.length ? { keywords: keywords.join(', ') } : {}),
  }
}

/** JSON for a `<script type="application/ld+json">`: `<` escaped, so no text from the admin can close the script. */
export const jsonLdText = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c')
