/**
 * Fills the pages built on 2026-10-26 with what is known: the Legal page 14 drafts (scripts/legal-drafts.ts)
 * and the press articles about the studio for page 10 (from content-source/press.json, collected 2026-10-25).
 * Run: npx payload run scripts/fill-pages.ts
 * Safe to re-run: a document or article that already exists (same slug or same link) is left as it is. Nothing is deleted.
 */
import { getPayload } from 'payload'

import config from '../src/payload.config'
import { legalDrafts } from './legal-drafts'
import { toLexical } from './lexical'

const payload = await getPayload({ config })
const locale = 'ru' as const
const log: string[] = []

for (const d of legalDrafts) {
  const found = await payload.find({ collection: 'legal', where: { slug: { equals: d.slug } }, limit: 1, depth: 0 })
  if (found.docs[0]) continue
  await payload.create({ collection: 'legal', locale, data: { slug: d.slug, title: d.title, date: '2026-10-26T00:00:00.000Z', text: toLexical(d.text) as never } })
  log.push(`legal document added: ${d.title}`)
}

// Dead links point at their Wayback copies; inmyroom gives no date, so the project's year stands in
const articles = [
  { project: 'collector-office-moscow', source: 'AD Magazine', date: '2015-11-17', title: 'Офис коллекционера в Москве: минималистичный дизайн от студии ID project', url: 'https://web.archive.org/web/20191023182500/https://www.admagazine.ru/interior/ofis-kollekcionera-v-moskve' },
  { project: 'bathroom-house-with-angels', source: 'Houzz', date: '2016-01-25', title: 'Ванная недели: Эко-минимализм, дерево и фарфор в старинном доме', url: 'https://flatica.ru/statyi/vannaya-nedeli-eko-minimalizm-derevo-i-farfor-v-starinnom-dome-stsetivw-vs~60235228' },
  { project: 'monkeys-cafe', source: 'INMYROOM', date: '2016-01-01', title: "Интерьер нового кафе Monkey's от дизайн-студии ID project", url: 'https://web.archive.org/web/20241212143257/https://www.inmyroom.ru/posts/12254-interier-novogo-kafe-monkey-s-ot-dizayn-studii-id-project' },
  { project: 'kitchenaid-flagship-showroom', source: 'SALON-interior', date: '2017-06-08', title: 'В Москве открылся первый фирменный магазин KitchenAid', url: 'https://salon.ru/news/v-moskve-otkrylsya-pervyj-firmennyj-magazin-kitchenaid-39322' },
  { project: 'kitchen-for-larisa', source: 'Designchat', date: '2018-12-28', title: 'Самый нужный подарок: благотворительный проект «Кухня для Ларисы»', url: 'https://designchat.com/design/kuxnia-blagotvoritelnost.html' },
]
for (const a of articles) {
  const found = await payload.find({ collection: 'press', where: { url: { equals: a.url } }, limit: 1, depth: 0 })
  if (found.docs[0]) continue
  const project = (await payload.find({ collection: 'projects', where: { slug: { equals: a.project } }, limit: 1, depth: 0 })).docs[0]
  await payload.create({
    collection: 'press',
    locale,
    data: { title: a.title, source: a.source, date: new Date(a.date).toISOString(), url: a.url, project: project?.id },
  })
  log.push(`press article added: ${a.source} · ${a.title}${project ? '' : ' (project not found)'}`)
}

console.log(log.length ? log.join('\n') : 'nothing to add')
process.exit(0)
