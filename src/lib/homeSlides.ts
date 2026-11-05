import { getPayload } from 'payload'
import config from '@payload-config'

import { dictionaries } from '@/i18n/dictionaries'
import { getLocale } from '@/i18n/server'
import { projectPath, type ProjectKind } from './routes'
import { asVisitor } from './published'

export type Slide = {
  key: string
  title: string
  /** Name left off the slide (Главная → «Показывать название на слайде главной»); links and photo descriptions still use the title */
  hideName?: boolean
  /** The project page; placeholders have none and are not links */
  href?: string
  image?: { url: string; alt: string; width?: number; height?: number }
}

/** Shown until the studio ticks projects for Home in /admin. */
const placeholders = (kind: ProjectKind, label: string): Slide[] =>
  [1, 2, 3, 4].map((n) => ({ key: `${kind}-${n}`, title: `[${label} ${n}]` }))

/**
 * Home sliders: left 1.2 = public interiors (opens page 8), right 1.3 = residential (opens page 5).
 * Confirmed reading; the spec labels both sliders "public interiors".
 */
export async function getHomeSlides(): Promise<{ left: Slide[]; right: Slide[] }> {
  const locale = await getLocale()
  const t = dictionaries[locale]
  try {
    const payload = await getPayload({ config })
    const [{ docs }, home] = await Promise.all([
      payload.find({
        ...asVisitor,
        collection: 'projects',
        locale,
        where: { onHome: { equals: true }, kind: { in: ['public', 'residential'] } },
        sort: 'homeOrder',
        limit: 40,
        depth: 1,
      }),
      payload.findGlobal({ ...asVisitor, slug: 'home', depth: 0 }),
    ])
    // One switch for all slides (Ewan, 2026-11-05)
    const hideName = home.showSlideNames === false
    const toSlide = (d: (typeof docs)[number]): Slide => {
      const cover = typeof d.cover === 'object' && d.cover ? d.cover : undefined
      const img = cover?.sizes?.panorama?.url ? cover.sizes.panorama : cover
      return {
        key: String(d.id),
        title: d.title ?? '',
        hideName,
        href: projectPath(d.kind as ProjectKind, d.slug),
        image: img?.url ? { url: img.url, alt: cover?.alt?.trim() || d.title || '', width: img.width ?? undefined, height: img.height ?? undefined } : undefined,
      }
    }
    const left = docs.filter((d) => d.kind === 'public').map(toSlide)
    const right = docs.filter((d) => d.kind === 'residential').map(toSlide)
    return {
      left: left.length ? left : placeholders('public', t.kinds.public),
      right: right.length ? right : placeholders('residential', t.kinds.residential),
    }
  } catch (err) {
    console.error('[home] could not load projects, showing placeholders', err)
    return {
      left: placeholders('public', t.kinds.public),
      right: placeholders('residential', t.kinds.residential),
    }
  }
}
