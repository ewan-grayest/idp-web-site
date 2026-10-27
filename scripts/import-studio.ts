/**
 * Real studio content from its public pages (flatica/houzz, AD, Salon, inmyroom, designchat, Yandex Disk, VK, Taplink),
 * collected into the "content-source" folder next to the site: projects.json, people.json, press.json, data.json, images/.
 * Run: npx payload run scripts/import-studio.ts     (CONTENT_DIR=/path/to/content-source to use another folder)
 * Safe to re-run: a project, person, tag or journal issue that already exists (same slug or same title) is left as it is,
 * and Studio texts are only filled in where they are empty. Nothing is deleted.
 */
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'

import config from '../src/payload.config'

type Img = { path: string; url?: string; width?: number; height?: number }
type Press = { source: string; title: string; url: string; date?: string; author?: string; archive_url?: string }
type SrcProject = {
  slug: string
  title: string
  kind: 'residential' | 'public'
  location?: string | null
  area?: number | null
  year?: number | null
  description?: string
  authors?: { name: string; role: string }[]
  tags?: string[]
  press?: Press[]
  images?: Img[]
}
type SrcPerson = { slug: string; name: string; role?: string; bio?: string }

const dir = path.resolve(process.env.CONTENT_DIR || '../content-source')
const read = <T>(file: string): T => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))

const payload = await getPayload({ config })
const locale = 'ru' as const
const log: string[] = []

// Titles as the studio itself names them on Taplink, or shortened where the source title is a sentence
const titles: Record<string, string> = {
  'petri-pizzeria': 'Пиццерия Petri',
  'monkeys-cafe': "Кафе Monkey's",
  'apartment-moscow-center': 'Квартира в центре Москвы',
  'penthouse-shmitovsky': 'Пентхаус в ЖК «Шмитовский»',
}
// Status tags from flatica say how the photos were made, not what the project is about
const skipTags = new Set(['реализовано', 'визуализация', 'реализация + визуализации'])

const translit: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n',
  о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
}
const slugify = (s: string) =>
  [...s.toLowerCase()].map((c) => translit[c] ?? c).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
const clean = (s: string) => s.replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
const day = (date: string | undefined, year: number | null | undefined) =>
  date ? new Date(date).toISOString() : year ? new Date(Date.UTC(year, 0, 1)).toISOString() : undefined

async function findOne(collection: 'projects' | 'people' | 'tags' | 'issues', field: string, value: string) {
  const r = await payload.find({ collection, where: { [field]: { equals: value } }, limit: 1, locale, depth: 0 })
  return r.docs[0] as { id: number } | undefined
}

async function upload(file: string, alt?: string) {
  const filePath = path.join(dir, file)
  if (!fs.existsSync(filePath)) {
    log.push(`missing file, skipped: ${file}`)
    return undefined
  }
  const doc = await payload.create({ collection: 'media', data: alt ? { alt } : {}, filePath, locale })
  return doc.id
}

const tagIds = new Map<string, number>()
async function tag(title: string) {
  const slug = slugify(title)
  if (!slug) return undefined
  if (!tagIds.has(slug)) {
    const found = (await findOne('tags', 'slug', slug)) ?? (await payload.create({ collection: 'tags', data: { slug, title }, locale }))
    tagIds.set(slug, found.id)
  }
  return tagIds.get(slug)
}

// People first, so projects can point to their authors
const people = new Map<string, number>()
for (const [k, p] of read<SrcPerson[]>('people.json').entries()) {
  const found = await findOne('people', 'slug', p.slug)
  if (found) {
    log.push(`person exists, left as is: ${p.name}`)
    people.set(p.name, found.id)
    continue
  }
  // The source roles carry our notes ("предположительно сооснователь"); the site shows only the plain position
  const doc = await payload.create({ collection: 'people', data: { slug: p.slug, name: p.name, role: 'Дизайнер интерьера', order: k + 1 }, locale })
  people.set(p.name, doc.id)
  log.push(`person added: ${p.name}`)
}

const projects = read<SrcProject[]>('projects.json')
// Newest first on Home; among equal years the project with the widest photo leads
const width = (p: SrcProject) => Math.max(0, ...(p.images ?? []).filter((i) => (i.width ?? 0) >= (i.height ?? 0)).map((i) => i.width ?? 0))
const order = [...projects].sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || width(b) - width(a)).map((p) => p.slug)
const added: { slug: string; id: number; authors: string[]; year?: number | null; title: string }[] = []

for (const p of projects) {
  const title = titles[p.slug] ?? clean(p.title)
  if ((await findOne('projects', 'slug', p.slug)) || (await findOne('projects', 'title', title))) {
    log.push(`project exists, left as is: ${title}`)
    continue
  }
  const images = (p.images ?? []).filter((i) => fs.existsSync(path.join(dir, i.path)))
  // Cover: the widest landscape photo; the Home slider needs a wide one
  const landscape = images.filter((i) => (i.width ?? 0) >= (i.height ?? 0)).sort((a, b) => (b.width ?? 0) - (a.width ?? 0))
  const coverImg = landscape[0] ?? images[0]
  const ids = new Map<string, number>()
  for (const i of images) {
    const id = await upload(i.path)
    if (id) ids.set(i.path, id)
  }
  const facts = [
    p.location && `Место: ${clean(p.location)}`,
    p.area && `Площадь: ${String(p.area).replace('.', ',')} м²`,
    p.year && `Год: ${p.year}`,
    ...(p.authors ?? []).filter((a) => a.role === 'фотограф').map((a) => `Фото: ${a.name}`),
  ].filter(Boolean)
  const summary = [p.description?.trim(), facts.join('\n')].filter(Boolean).join('\n\n')
  const authorNames = (p.authors ?? []).map((a) => a.name).filter((n) => people.has(n))
  const lead = (p.authors ?? []).find((a) => people.has(a.name) && a.role.startsWith('автор'))
  const tags = (await Promise.all((p.tags ?? []).filter((t) => !skipTags.has(t)).map(tag))).filter((t): t is number => !!t)
  const achievements = [
    ...(p.press ?? []).map((pr) => ({
      date: day(pr.date, p.year)!,
      title: clean(pr.title),
      text: [pr.source.replace(/ \(.*\)$/, ''), pr.author].filter(Boolean).join(', '),
      link: pr.archive_url ?? pr.url,
    })),
    ...(/ARCHPOINT/.test(p.title) ? [{ date: day(undefined, p.year)!, title: 'Третье место в конкурсе ARCHPOINT CONCEPT AWARDS 2015' }] : []),
  ].filter((a) => a.date)
  const cover = coverImg ? ids.get(coverImg.path) : undefined
  const doc = await payload.create({
    collection: 'projects',
    locale,
    data: {
      title,
      slug: p.slug,
      kind: p.kind,
      cover,
      onHome: !!coverImg && (coverImg.width ?? 0) >= 990 && (coverImg.width ?? 0) >= (coverImg.height ?? 0),
      homeOrder: 100 + order.indexOf(p.slug),
      tags,
      gallery: images.map((i) => ids.get(i.path)).filter(Boolean).map((image) => ({ image: image! })),
      leadAuthor: lead ? people.get(lead.name) : undefined,
      leadRole: lead ? 'Автор проекта' : undefined,
      authors: authorNames.map((n) => people.get(n)!),
      summary,
      achievements,
    },
  })
  added.push({ slug: p.slug, id: doc.id, authors: authorNames, year: p.year, title })
  log.push(`project added: ${title} (${p.kind}, ${ids.size} photos${cover ? '' : ', NO PHOTOS'})`)
}

// Person timelines 4.2: the projects each person authored
for (const [name, id] of people) {
  const mine = added.filter((a) => a.authors.includes(name) && a.year)
  if (!mine.length) continue
  const person = await payload.findByID({ collection: 'people', id, locale, depth: 0 })
  if (person.achievements?.length) continue
  await payload.update({
    collection: 'people',
    id,
    locale,
    data: { achievements: mine.map((a) => ({ date: day(undefined, a.year)!, title: a.title, project: a.id })) },
  })
}

// Online journal 3.4: the studio's two Joomag magazines. Dates come from the cover and the Joomag issue id
const issues = [
  { number: 1, title: 'Studio ID project. Индивидуальный дизайн вашего интерьера', date: '2018-01-01', cover: 'images/joomag/studio-id-project-cover.png' },
  { number: 2, title: 'Пример документации дизайн-проекта частной квартиры', date: '2018-01-25', cover: 'images/joomag/working-id-example-cover.png' },
]
for (const i of issues) {
  if (await findOne('issues', 'title', i.title)) continue
  const cover = await upload(i.cover)
  await payload.create({ collection: 'issues', locale, data: { number: i.number, title: i.title, date: new Date(i.date).toISOString(), cover } })
  log.push(`journal issue added: ${i.title}`)
}

// Studio page 3: mission, vision, history and the map point. Only empty fields are filled in
const studio = await payload.findGlobal({ slug: 'studio', locale, depth: 0 })
// press.json: a list of articles, or an object holding lists (articles, magazines); only dated articles with a link count
const pressFile = read<unknown>('press.json')
const lists = Array.isArray(pressFile) ? [pressFile] : Object.values(pressFile as object).filter(Array.isArray)
const articles = (lists.flat() as Press[]).filter((a) => a?.date && a.url && a.title && !/joomag/i.test(a.url))
const history = [
  ...articles.map((a) => ({
    date: new Date(a.date!).toISOString(),
    title: `Публикация в ${a.source.replace(/ \(.*\)$/, '')}`,
    text: clean(a.title),
    project: added.find((p) => projects.find((s) => s.slug === p.slug)?.press?.some((x) => x.url === a.url))?.id,
  })),
  { date: new Date('2015-01-01').toISOString(), title: 'ARCHPOINT CONCEPT AWARDS 2015', text: 'Третье место за проект пиццерии Petri', project: added.find((p) => p.slug === 'petri-pizzeria')?.id },
  { date: new Date('2018-01-01').toISOString(), title: 'Журнал Studio ID project', text: 'Первый выпуск журнала студии' },
]
await payload.updateGlobal({
  slug: 'studio',
  locale,
  data: {
    mission: studio.mission || 'Интерьеры с интеллектом. Индивидуальный подход к созданию и реализации интерьеров жилого и общественного назначения.',
    vision:
      studio.vision ||
      'Мы соединили академический подход МАРХИ и творческую свободу POLI.DESIGN (Политехнический университет Милана). ' +
        'Основная задача студии — поиск и воплощение индивидуальных и нестандартных решений для каждого проекта, в соответствии со всеми пожеланиями заказчика, ' +
        'с учётом норм и правил, последних технологий и тенденций в архитектуре и дизайне.',
    history: studio.history?.length ? studio.history : history,
    // Point of the studio's Taplink map marker: Москва, ул. Солянка, 1/2 с2
    lat: 55.75393,
    lng: 37.63913,
  },
})
log.push('studio texts and map point updated (empty fields only)')

console.log(log.join('\n'))
console.log(`\nAdded ${added.length} projects, ${tagIds.size} tags in use.`)
process.exit(0)
