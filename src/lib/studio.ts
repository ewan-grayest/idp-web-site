import { getPayload, type Where } from 'payload'
import config from '@payload-config'

import { dictionaries } from '@/i18n/dictionaries'
import { getLocale } from '@/i18n/server'
import type { Person, Project } from '@/payload-types'
import type { TimelineEvent } from '@/components/shared/Timeline'
import { promoBackgroundUrl, type VideoSource } from './promo'
import { mediaUrl, partnerPath, personPath, projectPath } from './projects'
import { getSettings } from './settings'
import { asVisitor } from './published'

/** One team member as the strip 3.2 needs it. */
export type Member = {
  slug: string
  name: string
  role: string
  quote: string
  href: string
  /** How many achievements 4.2 the person page shows; the card 3.2-a links to them */
  achievements: number
  thumb?: string
  photo?: string
}

const toMember = (p: Person): Member => ({
  slug: p.slug,
  name: p.name ?? '',
  role: p.role ?? '',
  quote: p.quote ?? '',
  href: personPath(p.slug),
  achievements: p.achievements?.length ?? 0,
  thumb: mediaUrl(p.portrait, 'thumb'),
  photo: mediaUrl(p.photo, 'wide') ?? mediaUrl(p.portrait, 'wide'),
})

/**
 * 3.2 team strip. `?project=<slug>` (from 5.3.2) narrows it to that project's authors,
 * `?tag=<slug>` to people with that tag. Unknown filters fall back to the whole team.
 */
export async function getTeam(filter: { project?: string; tag?: string }) {
  const payload = await getPayload({ config })
  const locale = await getLocale()
  const t = dictionaries[locale].studio
  let where: Where = { onTeam: { equals: true } }
  let label: string | null = null

  if (filter.project) {
    const { docs } = await payload.find({ ...asVisitor, collection: 'projects', locale, where: { slug: { equals: filter.project } }, depth: 0, limit: 1 })
    const project = docs[0]
    if (project) {
      const ids = [project.leadAuthor, ...(project.authors ?? [])].flatMap((a) => (a == null ? [] : [typeof a === 'object' ? a.id : a]))
      where = { id: { in: [...new Set(ids)] } }
      label = t.projectTeam(project.title ?? '')
    }
  } else if (filter.tag) {
    const { docs } = await payload.find({ ...asVisitor, collection: 'tags', locale, where: { slug: { equals: filter.tag } }, depth: 0, limit: 1 })
    if (docs[0]) {
      where = { and: [where, { tags: { contains: docs[0].id } }] }
      label = t.tagTeam(docs[0].title ?? '')
    }
  }

  const { docs } = await payload.find({ ...asVisitor, collection: 'people', locale, where, sort: 'order', depth: 1, limit: 200 })
  return { members: docs.map(toMember), label }
}

/**
 * Wordless 8 s clip until the studio's video is uploaded. H.264 MP4 first: Safari and Chrome on a Mac decode it in
 * hardware. The codecs in the type let browsers without H.264 (open-source Chromium, used by the tests) skip to WebM.
 */
const placeholderVideo: VideoSource[] = [
  { src: '/promo-placeholder.mp4', type: 'video/mp4; codecs="avc1.64001F"' },
  { src: '/promo-placeholder.webm', type: 'video/webm; codecs="vp9"' },
]

/** Page 2 video: the upload in «Студия» → «Промо-видео», else the placeholder clip. */
export type PromoVideoData = {
  sources: VideoSource[]
  placeholder: boolean
  /** Studio → Promo video switches (Ewan, 2026-10-28); a setting never saved counts as on */
  firstVisit: boolean
  autoplay: boolean
  sound: boolean
  /** The image shown until the video starts; none: the video's first frame (Ewan, 2026-11-12) */
  background?: string
}

export async function getPromoVideo(): Promise<PromoVideoData> {
  const payload = await getPayload({ config })
  const studio = await payload.findGlobal({
    ...asVisitor,
    slug: 'studio',
    depth: 1,
    select: { promoVideo: true, introOnFirstVisit: true, promoAutoplay: true, promoSound: true, promoBackground: true, promoBackgroundImage: true },
  })
  const options = {
    firstVisit: studio.introOnFirstVisit !== false,
    autoplay: studio.promoAutoplay !== false,
    sound: studio.promoSound !== false,
    // «Картинку» with no image picked falls back to the first frame
    background: studio.promoBackground === 'image' ? promoBackgroundUrl(studio.promoBackgroundImage) : undefined,
  }
  const file = studio.promoVideo
  if (file && typeof file === 'object' && file.url) {
    return { sources: [{ src: file.url, type: file.mimeType ?? undefined }], placeholder: false, ...options }
  }
  return { sources: placeholderVideo, placeholder: true, ...options }
}

/** Everything else on page 3: mission 3.1, history 3.3, journal 3.4, contacts 3.5, partners 3.7. */
export async function getStudio() {
  const settings = await getSettings()
  const payload = await getPayload({ config })
  const locale = await getLocale()
  const [studio, issues, partners] = await Promise.all([
    payload.findGlobal({ ...asVisitor, slug: 'studio', locale, depth: 1 }),
    payload.find({ ...asVisitor, collection: 'issues', locale, sort: '-date', depth: 1, limit: 48 }),
    payload.find({ ...asVisitor, collection: 'partners', locale, sort: 'order', depth: 1, limit: 120 }),
  ])

  const history: TimelineEvent[] = (studio.history ?? []).map((e, k) => {
    const project = typeof e.project === 'object' ? (e.project as Project | null) : null
    return {
      key: e.id ?? String(k),
      date: e.date,
      title: e.title ?? '',
      text: e.text,
      image: mediaUrl(e.image, 'thumb'),
      link: project ? projectPath(project.kind, project.slug) : null,
    }
  })

  return {
    mission: studio.mission ?? '',
    vision: studio.vision ?? '',
    history,
    address: studio.address ?? '',
    map: { lat: studio.lat ?? 55.7533, lng: studio.lng ?? 37.6366, zoom: studio.zoom ?? 16, provider: settings.mapProvider },
    issues: issues.docs.map((i) => ({
      key: String(i.id),
      number: i.number,
      // "октябрь 2026" / "October 2026", formatted here so server and browser agree
      when: dictionaries[locale].common.monthYear(new Date(i.date)),
      title: i.title ?? '',
      cover: mediaUrl(i.cover, 'thumb'),
      link: i.link || undefined,
    })),
    partners: partners.docs.map((p) => ({ key: p.slug, name: p.name ?? '', href: partnerPath(p), logo: mediaUrl(p.logo, 'thumb') })),
  }
}
