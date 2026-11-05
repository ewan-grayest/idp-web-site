/**
 * Archived studio content from web.archive.org: id-proekt.com and get-together.ru, collected into
 * content-source/idproekt/site.json and content-source/gettogether/site.json (image paths relative to content-source/).
 * Run: scripts/run-archive-import.sh   (or npx payload run scripts/import-archive.ts, CONTENT_DIR=/path/to/content-source)
 * Safe to re-run: it only adds records and fills empty fields. A partner or project that already exists (same slug or
 * same name/title) is left as it is, an award or history entry with the same title is not added twice, photos already
 * in a gallery (same perceptual hash) are not added again. Titles, covers and existing photos are never changed.
 */
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { getPayload } from 'payload'

import config from '../src/payload.config'
import { toLexical } from './lexical'

type Img = { path: string | null; width: number | null; height: number | null; archived?: boolean; md5?: string | null }
type SrcProject = {
  slug: string
  title: string
  kind: 'residential' | 'public' | 'other'
  location?: string | null
  area?: number | null
  year?: number | null
  description?: string | null
  authors?: string[]
  tags?: string[]
  images: Img[]
  matches?: string | null
  status: 'new' | 'matching' | 'partial match'
}
type Award = { text: string; year: number | null; people: string[]; studio: boolean; source: string }
type GtPartner = {
  slug: string
  name: string
  category: string[]
  text?: string | null
  text_idproekt?: string | null
  link?: string | null
  discount?: string | null
  logo?: { path: string } | null
  logo_idproekt?: { path: string } | null
}

const dir = path.resolve(process.env.CONTENT_DIR || '../content-source')
const mediaDir = path.resolve(process.env.MEDIA_DIR || 'media')
const read = <T>(file: string): T => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
const id = read<{ studio: any; people: { slug: string; name: string }[]; projects: SrcProject[]; awards: Award[] }>('idproekt/site.json')
const gt = read<{ texts: Record<string, any>; partners: GtPartner[]; contacts: Record<string, string> }>('gettogether/site.json')

const payload = await getPayload({ config })
const locale = 'ru' as const
const counts = { created: 0, updated: 0, skipped: 0 }
// Printed as it happens, so the log shows how far a failed run got
const created = (s: string) => (counts.created++, console.log(`CREATE ${s}`))
const updated = (s: string) => (counts.updated++, console.log(`UPDATE ${s}`))
const skipped = (s: string) => (counts.skipped++, console.log(`SKIP   ${s}`))

const translit: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n',
  о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
}
const slugify = (s: string) =>
  [...s.toLowerCase()].map((c) => translit[c] ?? c).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
const same = (a?: string | null, b?: string | null) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase()
const jan1 = (year: number) => new Date(Date.UTC(year, 0, 1)).toISOString()
const empty = (v: unknown) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '')

type Slug = 'projects' | 'partners' | 'people' | 'tags'
async function findOne(collection: Slug, field: string, value: string) {
  const r = await payload.find({ collection, where: { [field]: { equals: value } }, limit: 1, locale, depth: 0 })
  return r.docs[0] as any
}

async function upload(file: string, alt?: string) {
  const filePath = path.join(dir, file)
  if (!fs.existsSync(filePath)) {
    skipped(`missing file: ${file}`)
    return undefined
  }
  const doc = await payload.create({ collection: 'media', data: alt ? { alt } : {}, filePath, locale })
  created(`media #${doc.id} ${file}`)
  return doc.id as number
}

// Perceptual hash (dHash, 64 bits): survives resizing and recompression, so a re-saved copy of a photo still matches
async function dhash(file: string) {
  const px = await sharp(file).greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer()
  let h = 0n
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) h = (h << 1n) | (px[y * 9 + x] > px[y * 9 + x + 1] ? 1n : 0n)
  return h
}
const distance = (a: bigint, b: bigint) => [...(a ^ b).toString(2)].filter((c) => c === '1').length
const SAME_PHOTO = 8
async function mediaHash(mediaId: number) {
  const m = await payload.findByID({ collection: 'media', id: mediaId, depth: 0 }).catch(() => undefined)
  const file = m?.filename && path.join(mediaDir, m.filename)
  return file && fs.existsSync(file) ? dhash(file) : undefined
}

// Tags: an existing tag with the same slug or title is reused
const tagAlias: Record<string, string> = { Квартиры: 'Квартира' }
const tagIds = new Map<string, number>()
async function tag(title: string) {
  title = tagAlias[title] ?? title
  const slug = slugify(title)
  if (!slug) return undefined
  if (!tagIds.has(slug)) {
    let doc = (await findOne('tags', 'slug', slug)) ?? (await findOne('tags', 'title', title))
    if (!doc) {
      doc = await payload.create({ collection: 'tags', data: { slug, title }, locale })
      created(`tag #${doc.id} ${title}`)
    }
    tagIds.set(slug, doc.id)
  }
  return tagIds.get(slug)
}
const tagList = async (titles: string[]) => [...new Set((await Promise.all(titles.map(tag))).filter((t): t is number => !!t))]

// ---------------------------------------------------------------- a) Get-Together partners
console.log('\n== Partners')
// Category tags first, in the order the filter shows them
for (const t of ['Мебель', 'Свет', 'Отделка', 'Декор', 'Ванная', 'Кухня', 'Тепло']) await tag(t)

// The id-proekt partner page repeats the discount and the manager's phone at the end of the text: those have their own fields
const partnerText = (p: GtPartner) => {
  const source = p.text_idproekt?.trim() ? p.text_idproekt : p.text
  if (!source) return undefined
  const lines = source
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/Скидка по карте|Индивидуальная скидка|Персональный менеджер|^тел\./i.test(l))
  if (!lines.length) return undefined
  // "- является официальным дилером…" or "одно из самых ярких…" continue the brand name, as the page showed them
  lines[0] = lines[0].replace(/^[-–—]\s*/, '')
  if (/^[a-zа-яё]/.test(lines[0])) lines[0] = `${p.name} — ${lines[0]}`
  return toLexical(lines.join('\n\n'))
}
// RR Factory's archived link points to id-proect.com, a misspelt studio domain, not the partner
const badLinks = new Set(['http://id-proect.com'])
const partnerProjects: Record<string, string> = {
  kitchenaid: 'kitchenaid-flagship-showroom',
  nobilia: 'kitchen-for-larisa',
  vitra: 'kitchen-for-larisa',
  'mdm-light': 'kitchen-for-larisa',
  dzhiel: 'kitchen-for-larisa',
  skol: 'kitchen-for-larisa',
  nidus: 'kitchen-for-larisa',
  'nemetskaya-elektrotekhnika': 'kitchen-for-larisa',
}

const lastPartner = await payload.find({ collection: 'partners', sort: '-order', limit: 1, depth: 0 })
let order = (lastPartner.docs[0]?.order as number | undefined) ?? 0
for (const p of gt.partners) {
  order++
  const existing = (await findOne('partners', 'slug', p.slug)) ?? (await findOne('partners', 'name', p.name))
  if (existing) {
    skipped(`partner exists: ${p.name} (#${existing.id})`)
    continue
  }
  const logoPath = p.logo_idproekt?.path ?? p.logo?.path
  const logo = logoPath ? await upload(logoPath, p.name) : undefined
  const link = p.link && !badLinks.has(p.link) ? p.link : undefined
  if (p.link && !link) skipped(`partner link ${p.link} for ${p.name}: not the partner's site`)
  const doc = await payload.create({
    collection: 'partners',
    locale,
    data: {
      name: p.name,
      slug: p.slug,
      logo,
      text: partnerText(p) as any,
      link,
      discount: p.discount?.trim() || undefined,
      tags: await tagList(p.category),
      order,
    },
  })
  created(`partner #${doc.id} ${p.name}${logo ? '' : ' (no logo)'}${p.discount ? '' : ' (no discount)'}`)
}

// Partner ↔ project links named in the sources (KitchenAid showroom, the partners of «Кухня для Ларисы»)
for (const [slug, projectSlug] of Object.entries(partnerProjects)) {
  const partner = await findOne('partners', 'slug', slug)
  const project = await findOne('projects', 'slug', projectSlug)
  if (!partner || !project) {
    skipped(`link ${slug} → ${projectSlug}: ${partner ? 'project' : 'partner'} not found`)
    continue
  }
  const ids = ((partner.projects ?? []) as (number | { id: number })[]).map((x) => (typeof x === 'number' ? x : x.id))
  if (ids.includes(project.id)) {
    skipped(`link ${partner.name} → ${projectSlug}: already there`)
    continue
  }
  await payload.update({ collection: 'partners', id: partner.id, locale, data: { projects: [...ids, project.id] } })
  updated(`partner #${partner.id} ${partner.name}: project ${projectSlug} linked`)
}

// ---------------------------------------------------------------- b) New projects
console.log('\n== New projects')
const archived = (p: SrcProject) => {
  const seen = new Set<string>()
  return p.images.filter((i): i is Img & { path: string } => {
    if (!i.archived || !i.path || !fs.existsSync(path.join(dir, i.path))) return false
    const key = i.md5 ?? i.path
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
const peopleIds = new Map<string, number>()
for (const person of (await payload.find({ collection: 'people', limit: 100, depth: 0, locale })).docs) peopleIds.set(person.slug as string, person.id as number)

const summaryOf = (p: SrcProject) => {
  const facts = [
    p.location && `Место: ${p.location.trim()}`,
    p.area && `Площадь: ${String(p.area).replace('.', ',')} м²`,
    p.year && `Год: ${p.year}`,
  ].filter(Boolean)
  return [p.description?.trim(), facts.join('\n')].filter(Boolean).join('\n\n') || undefined
}

const fresh = id.projects.filter((p) => p.status === 'new')
let homeOrder = 200
for (const p of fresh) {
  const exists = (await findOne('projects', 'slug', p.slug)) ?? (await findOne('projects', 'title', p.title.trim()))
  if (exists) {
    skipped(`project exists: ${p.title} (#${exists.id})`)
    continue
  }
  const images = archived(p)
  const ids = new Map<string, number>()
  for (const i of images) {
    const mid = await upload(i.path)
    if (mid) ids.set(i.path, mid)
  }
  // Cover: the widest landscape photo, else the first one; only a wide landscape cover makes a good Home slide
  const landscape = images.filter((i) => (i.width ?? 0) >= (i.height ?? 0)).sort((a, b) => (b.width ?? 0) - (a.width ?? 0))
  const coverImg = landscape[0] ?? images[0]
  const onHome = !!coverImg && (coverImg.width ?? 0) >= 1200 && (coverImg.width ?? 0) > (coverImg.height ?? 0)
  const authors = (p.authors ?? []).map((s) => peopleIds.get(s)).filter((x): x is number => !!x)
  const doc = await payload.create({
    collection: 'projects',
    locale,
    data: {
      title: p.title.trim(),
      slug: p.slug,
      // Archive projects became product design under ID Lab (Ewan, 2026-11-05)
      kind: p.kind === 'other' ? 'product' : p.kind,
      cover: coverImg ? ids.get(coverImg.path) : undefined,
      onHome,
      homeOrder: onHome ? homeOrder++ : undefined,
      tags: await tagList(p.tags ?? []),
      gallery: images.map((i) => ids.get(i.path)).filter((x): x is number => !!x).map((image) => ({ image })),
      leadAuthor: authors[0],
      authors,
      summary: summaryOf(p),
    },
  })
  created(`project #${doc.id} ${p.slug} (${p.kind === 'other' ? 'archive' : p.kind}, ${ids.size} photos${onHome ? ', on Home' : ''}${coverImg ? '' : ', NO PHOTOS'})`)
}

// ---------------------------------------------------------------- c) Matched projects: more photos, empty fields
console.log('\n== Matched projects')
for (const p of id.projects.filter((x) => x.status === 'matching' && x.matches)) {
  const target = await findOne('projects', 'slug', p.matches!)
  if (!target) {
    skipped(`matched project ${p.matches} not found`)
    continue
  }
  const gallery = (target.gallery ?? []) as { id?: string; image: number | { id: number } }[]
  const known: bigint[] = []
  for (const g of gallery) {
    const h = await mediaHash(typeof g.image === 'number' ? g.image : g.image.id)
    if (h !== undefined) known.push(h)
  }
  const added: { image: number }[] = []
  let dupes = 0
  for (const i of archived(p)) {
    const h = await dhash(path.join(dir, i.path))
    if (known.some((k) => distance(k, h) <= SAME_PHOTO)) {
      dupes++
      continue
    }
    const mid = await upload(i.path)
    if (!mid) continue
    known.push(h)
    added.push({ image: mid })
  }
  const data: Record<string, unknown> = {}
  if (added.length) data.gallery = [...gallery, ...added]
  if (empty(target.summary) && p.description?.trim()) data.summary = summaryOf(p)
  if (p.area || p.year) skipped(`${p.matches}: area/year (${p.area ?? '—'} / ${p.year ?? '—'}): projects have no such fields`)
  if (Object.keys(data).length) {
    await payload.update({ collection: 'projects', id: target.id, locale, data })
    updated(`project #${target.id} ${p.matches}: +${added.length} photos${data.summary ? ', summary filled' : ''} (${dupes} already there)`)
  } else skipped(`project ${p.matches}: nothing new (${dupes} photos already there)`)
}
for (const p of id.projects.filter((x) => x.status === 'partial match')) {
  skipped(`partial match ${p.slug} → ${p.matches}: only one shared photo, not merged`)
}

// ---------------------------------------------------------------- d) Awards from /about
console.log('\n== Awards')
// "Диплом …, 2015г., Александр Хороля" → "Диплом …"
const awardTitle = (a: Award) => a.text.replace(/,?\s*\d{4}\s*г\.?,?.*$/, '').trim()
const petri = await findOne('projects', 'slug', 'petri-pizzeria')
const studioAwards: Award[] = []
for (const a of id.awards) {
  if (a.source !== '/about' || !a.year) {
    skipped(`award without a year or not from /about: ${a.text}`)
    continue
  }
  if (a.studio) {
    studioAwards.push(a)
    continue
  }
  const title = awardTitle(a)
  for (const name of a.people) {
    const slug = id.people.find((x) => x.name === name)?.slug
    const person = slug && (await findOne('people', 'slug', slug))
    if (!person) {
      skipped(`award ${title}: person ${name} not found`)
      continue
    }
    const list = (person.achievements ?? []) as { title: string }[]
    if (list.some((x) => same(x.title, title))) {
      skipped(`${name}: already has «${title}»`)
      continue
    }
    const entry = {
      date: jan1(a.year),
      title,
      text: a.people.length > 1 ? `Авторы: ${a.people.join(', ')}` : undefined,
      project: /ARCHPOINT/.test(a.text) && petri ? petri.id : undefined,
    }
    await payload.update({ collection: 'people', id: person.id, locale, data: { achievements: [...list, entry] } })
    updated(`person #${person.id} ${name}: achievement «${title}» (${a.year})`)
  }
}

// ---------------------------------------------------------------- e) Globals: empty fields only, studio awards
console.log('\n== Studio and page texts')
const studio = (await payload.findGlobal({ slug: 'studio', locale, depth: 0 })) as any
const history = (studio.history ?? []) as { title: string }[]
const newHistory = studioAwards
  .filter((a) => {
    const dup = history.some((h) => same(h.title, awardTitle(a)))
    if (dup) skipped(`studio history already has «${awardTitle(a)}»`)
    return !dup
  })
  .map((a) => ({ date: jan1(a.year!), title: awardTitle(a) }))

const contacts: Record<string, string> = {
  phone: '+7 (495) 792-16-83',
  email: 'info@id-proekt.com',
  partnersEmail: 'gettogether@id-proekt.com',
}
const studioData: Record<string, unknown> = {}
for (const [field, value] of Object.entries(contacts)) {
  if (empty(studio[field])) studioData[field] = value
  else skipped(`studio ${field} already filled`)
}
if (empty(studio.social?.facebook)) studioData.social = { ...studio.social, facebook: 'https://www.facebook.com/1Dproject' }
else skipped('studio social.facebook already filled')
if (newHistory.length) studioData.history = [...history, ...newHistory]
// The founding year, the /about text and the 2018 services and prices have no field of their own in Studio
skipped('studio founded 2010: no such field')
skipped(`studio about text: no such field (mission ${empty(studio.mission) ? 'empty' : 'filled'}, vision ${empty(studio.vision) ? 'empty' : 'filled'}: left as they are)`)
skipped(`services and prices 2018 (${id.studio.services?.length ?? 0} services): no matching field`)
if (Object.keys(studioData).length) {
  await payload.updateGlobal({ slug: 'studio', locale, data: studioData })
  updated(`studio: ${Object.keys(studioData).join(', ')}${newHistory.length ? ` (history +${newHistory.map((h) => h.title).join('; ')})` : ''}`)
}

const pageTexts = (await payload.findGlobal({ slug: 'page-texts', locale, depth: 0 })) as any
const richEmpty = (v: any) => !v?.root?.children?.some((c: any) => c.children?.some((t: any) => t.text?.trim()))
if (richEmpty(pageTexts.gt)) {
  const offer = (gt.texts.privileges as string[]).find((s) => s.startsWith('18%'))
  const program = [gt.texts.privileges_heading, ...(gt.texts.privileges as string[]).filter((s) => s !== offer).map((s) => `- ${s}`)]
  const gtText = [gt.texts.intro, program[0], program.slice(1).join('\n'), offer].filter(Boolean).join('\n\n')
  await payload.updateGlobal({ slug: 'page-texts', locale, data: { gt: toLexical(gtText) as any } })
  updated('page texts: Get-Together 6.1.2 (intro, program, 18% offer)')
} else skipped('page texts Get-Together 6.1.2 already filled')

console.log(`\nDone: ${counts.created} created, ${counts.updated} updated, ${counts.skipped} skipped.`)
process.exit(0)
