import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'

import { dictionaries } from '@/i18n/dictionaries'
import { getLocale } from '@/i18n/server'
import type { Media, Project } from '@/payload-types'
import type { ProjectKind } from './routes'
import { coverOf, mediaUrl, toCard, type CollectionCard } from './projects'
import type { Rich } from './rich'
import { partnersEmail, partnersPhone, social, studioEmail, studioPhone } from './site'

const isObj = <T extends object>(v: number | T | null | undefined): v is T => typeof v === 'object' && v !== null

/** Contacts and social links for the header, menu, footer and pages 3 and 6: the admin's, else the defaults in site.ts. */
export const getContacts = cache(async () => {
  const payload = await getPayload({ config })
  const s = await payload.findGlobal({
    slug: 'studio',
    locale: await getLocale(),
    depth: 0,
    select: { phone: true, email: true, partnersPhone: true, partnersEmail: true, social: true, address: true, lat: true, lng: true, zoom: true },
  })
  return {
    phone: s.phone || process.env.NEXT_PUBLIC_STUDIO_PHONE || studioPhone,
    email: s.email || studioEmail,
    partnersPhone: s.partnersPhone || partnersPhone,
    partnersEmail: s.partnersEmail || partnersEmail,
    social: social.map((x) => ({ ...x, href: s.social?.[x.key] || x.href })),
    address: s.address ?? '',
    map: { lat: s.lat ?? 55.7533, lng: s.lng ?? 37.6366, zoom: s.zoom ?? 16 },
  }
})

export type Contacts = Awaited<ReturnType<typeof getContacts>>

/** One entry on the vertical timeline of pages 11, 13 and 14. */
export type Entry = { slug: string; date: string; when: string; title: string; images: { url: string; alt: string }[]; text: Rich }

/** Pages 11 (lifestyle), 13 (careers) and 14 (legal): entries, newest first. */
export async function getEntries(collection: 'lifestyle' | 'careers' | 'legal'): Promise<Entry[]> {
  const payload = await getPayload({ config })
  const locale = await getLocale()
  // Same date: in the order they were added
  const { docs } = await payload.find({ collection, locale, sort: ['-date', 'createdAt'], depth: 1, pagination: false })
  const format = (d: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(d))
  return docs.map((e) => ({
    slug: e.slug,
    date: e.date,
    when: format(e.date),
    title: e.title ?? '',
    images: (e.images ?? []).filter(isObj).flatMap((m: Media) => {
      const url = mediaUrl(m, 'wide')
      return url ? [{ url, alt: m.alt?.trim() || '' }] : []
    }),
    text: e.text as Rich,
  }))
}

/** Company details for the Legal page 14 (Студия → Реквизиты); only the filled ones. */
export async function getCompany() {
  const payload = await getPayload({ config })
  const s = await payload.findGlobal({
    slug: 'studio',
    locale: await getLocale(),
    depth: 0,
    select: { company: true, inn: true, kpp: true, ogrn: true, legalAddress: true, bank: true },
  })
  return { company: s.company ?? '', inn: s.inn ?? '', kpp: s.kpp ?? '', ogrn: s.ogrn ?? '', legalAddress: s.legalAddress ?? '', bank: s.bank ?? '' }
}

/** One text of «Тексты страниц»: Get-Together 6.1.2, Payment 12.1 or Media and PR 15.1. */
export async function getPageText(key: 'gt' | 'payment' | 'media'): Promise<Rich> {
  const payload = await getPayload({ config })
  // depth 1: documents linked inside the text («Связь», internal links) come with their names and addresses
  const g = await payload.findGlobal({ slug: 'page-texts', locale: await getLocale(), depth: 1 })
  return g[key] as Rich
}

/** Page 10: articles, newest first, each with a wide photo (its own, else its project's). */
export async function getPress() {
  const payload = await getPayload({ config })
  const locale = await getLocale()
  const { docs } = await payload.find({ collection: 'press', locale, sort: '-date', depth: 2, pagination: false })
  return docs.map((a) => {
    const project = isObj(a.project) ? (a.project as Project) : null
    const photo = isObj(a.photo) ? a.photo : project ? coverOf(project) : undefined
    return {
      key: String(a.id),
      title: a.title ?? '',
      source: a.source ?? '',
      when: dictionaries[locale].common.monthYear(new Date(a.date)),
      url: a.url || undefined,
      image: mediaUrl(photo),
    }
  })
}

export type PressItem = Awaited<ReturnType<typeof getPress>>[number]

/** One partner block 6.3 with its projects 6.4 (picked in the admin plus those where it is tagged on a photo). */
export type PartnerBlock = {
  slug: string
  name: string
  logo?: string
  text: Rich
  link?: string
  photo?: string
  discount: string
  projects: (CollectionCard & { kind: ProjectKind })[]
  tags: { slug: string; title: string }[]
}

/** Page 6: every partner, in the admin's order. */
export async function getPartners(): Promise<PartnerBlock[]> {
  const payload = await getPayload({ config })
  const locale = await getLocale()
  const [{ docs }, tagged] = await Promise.all([
    payload.find({ collection: 'partners', locale, sort: 'order', depth: 2, pagination: false }),
    payload.find({ collection: 'projects', locale, depth: 1, pagination: false }),
  ])

  // Projects where a partner is tagged on a photo (5.1.3)
  const byPartner = new Map<number, Project[]>()
  for (const p of tagged.docs) {
    const rows = [...(p.gallery ?? []), ...(['concept', 'preview', 'process'] as const).flatMap((k) => p[k]?.photos ?? [])]
    const ids = new Set(rows.flatMap((r) => (r.hotspots ?? []).map((h) => (isObj(h.partner) ? h.partner.id : h.partner))))
    for (const id of ids) if (typeof id === 'number') byPartner.set(id, [...(byPartner.get(id) ?? []), p])
  }

  return docs.map((p) => {
    const own = (p.projects ?? []).filter(isObj) as Project[]
    const all = [...own, ...(byPartner.get(p.id) ?? [])].filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i)
    const tags = new Map<string, string>()
    for (const t of [...(p.tags ?? []), ...all.flatMap((x) => x.tags ?? [])]) if (isObj(t)) tags.set(t.slug, t.title ?? t.slug)
    return {
      slug: p.slug,
      name: p.name ?? '',
      logo: mediaUrl(p.logo, 'thumb'),
      text: p.text as Rich,
      link: p.link || undefined,
      photo: mediaUrl(p.photo),
      discount: p.discount ?? '',
      projects: all.map((x) => ({ ...toCard(x), kind: x.kind })),
      tags: [...tags].map(([slug, title]) => ({ slug, title })),
    }
  })
}
