/**
 * Development sample data: clearly fake projects, people, partners and grey placeholder photos,
 * so every section of the Project page can be seen before real content arrives.
 * Run: npx payload run scripts/seed.ts   (safe to re-run: it skips what already exists)
 */
import { getPayload } from 'payload'
import sharp from 'sharp'

import config from '../src/payload.config'
import { legalDrafts } from './legal-drafts'
import { toLexical } from './lexical'

const payload = await getPayload({ config })

async function placeholder(label: string, tone: string, w = 2400, h = 1350) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
    <rect width="160" height="90" fill="${tone}"/>
    <g fill="none" stroke="#4a4a4a" stroke-width=".3"><path d="M0 0 55 28M160 0 105 28M0 90 55 62M160 90 105 62"/><rect x="55" y="28" width="50" height="34"/></g>
    <text x="80" y="80" font-family="sans-serif" font-size="5" fill="#8a8a8a" text-anchor="middle">${label}</text></svg>`
  const data = await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer()
  return payload.create({
    collection: 'media',
    data: { alt: label },
    file: { data, mimetype: 'image/jpeg', name: `placeholder-${crypto.randomUUID().slice(0, 8)}.jpg`, size: data.length },
  })
}

async function upsert<T extends 'tags' | 'partners' | 'people' | 'issues'>(collection: T, slug: string, data: Record<string, unknown>) {
  const found = await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1 })
  if (found.docs[0]) return found.docs[0]
  return payload.create({ collection, data: { slug, ...data } as never })
}

const tones = ['#262626', '#2c2a27', '#24272a', '#29272b', '#272a27', '#2b2826', '#25262a', '#282828', '#2a2a2a']

const tags = await Promise.all(
  [['loft', 'Лофт'], ['brick', 'Кирпич'], ['oak', 'Дуб'], ['flat', 'Квартира'], ['moscow', 'Москва'], ['minimal', 'Минимализм']].map(
    ([slug, title]) => upsert('tags', slug, { title }),
  ),
)
const sofa = await upsert('partners', 'sample-furniture', { name: '[Партнёр GT: мебель]' })
const lamp = await upsert('partners', 'sample-light', { name: '[Партнёр GT: свет]' })
const author = await upsert('people', 'sample-architect', {
  name: '[ФАМИЛИЯ Имя]',
  role: 'Ведущий архитектор',
  quote: '[Умная мысль: одна фраза о том, как человек видит интерьер.]',
  order: 1,
})

// Page 3: team strip, history, journal, partners and studio texts
const team = [
  ['sample-founder', 'Основатель'],
  ['sample-designer-1', 'Дизайнер интерьера'],
  ['sample-designer-2', 'Дизайнер интерьера'],
  ['sample-visualiser', 'Визуализатор'],
  ['sample-buyer', 'Комплектатор'],
  ['sample-manager', 'Менеджер проектов'],
]
for (const [k, [slug, role]] of team.entries()) {
  const found = await payload.find({ collection: 'people', where: { slug: { equals: slug } }, limit: 1 })
  if (found.docs[0]) continue
  const portrait = await placeholder(`Портрет ${k + 2}`, tones[(k + 2) % 9], 1200, 1500)
  await payload.create({
    collection: 'people',
    data: { slug, name: `[ФАМИЛИЯ Имя ${k + 2}]`, role, quote: '[Умная мысль сотрудника.]', portrait: portrait.id, order: k === 0 ? 0 : k + 2 },
  })
}
// Issue 11 opens online (a stand-in address); the others offer «Получить экземпляр» from the cover
const issueLink = (n: number) => (n === 11 ? 'https://example.com/id-project-journal-11' : undefined)
for (const n of [12, 11, 10, 9, 8]) {
  const found = await payload.find({ collection: 'issues', where: { number: { equals: n } }, limit: 1 })
  if (found.docs[0]) {
    if (issueLink(n) && !found.docs[0].link) await payload.update({ collection: 'issues', id: found.docs[0].id, data: { link: issueLink(n) } })
    continue
  }
  const cover = await placeholder(`Выпуск ${n}`, tones[n % 9], 900, 1200)
  const month = String(n).padStart(2, '0')
  await payload.create({ collection: 'issues', data: { title: `[Тема выпуска ${n}]`, number: n, date: `2026-${month}-01`, cover: cover.id, link: issueLink(n) } })
}
for (const k of [3, 4, 5, 6, 7, 8]) await upsert('partners', `sample-partner-${k}`, { name: `[Партнёр ${k}]`, order: k })

const exists = await payload.find({ collection: 'projects', where: { slug: { equals: 'sample-loft' } }, limit: 1 })
if (!exists.docs[0]) {
  const frames = await Promise.all(Array.from({ length: 10 }, (_, k) => placeholder(`Кадр ${k + 1}`, tones[k % 9])))
  const stagePhotos = async (name: string) =>
    (await Promise.all([1, 2, 3].map((k) => placeholder(`${name} ${k}`, tones[(k + 3) % 9], 1600, 1200)))).map((m) => ({ image: m.id }))

  await payload.create({
    collection: 'projects',
    data: {
      title: '[Пример] Лофт на Солянке',
      slug: 'sample-loft',
      kind: 'residential',
      cover: frames[0].id,
      onHome: true,
      homeOrder: 0,
      tags: tags.map((t) => t.id),
      gallery: frames.map((m, k) => ({
        image: m.id,
        hotspots:
          k === 0
            ? [
                { label: 'диван', partner: sofa.id, x: 30, y: 62 },
                { label: 'светильник', partner: lamp.id, x: 62, y: 30 },
              ]
            : [],
      })),
      leadAuthor: author.id,
      authors: [author.id],
      summary: '[2–3 предложения: задача клиента, площадь, район, сроки. Пример для разработки.]',
      quote: '[Цитата автора о проекте]',
      concept: { photos: await stagePhotos('Концепт'), text: '[Идея, референсы, палитра материалов.]' },
      preview: { photos: await stagePhotos('Превью'), text: '[Что увидел клиент до реализации.]' },
      process: { photos: await stagePhotos('Процесс'), text: '[Этапы, подрядчики, сроки.]' },
      achievements: [
        { date: '2026-03-01', title: '[Премия, номинация]', text: '[Короткое описание события.]' },
        { date: '2025-06-01', title: '[Публикация в журнале]', text: '[Издание, номер.]' },
        { date: '2024-09-01', title: '[Сдача объекта]' },
      ],
    },
  })
  payload.logger.info('Sample project created: /projects/residential/sample-loft')
}
const cafe = await payload.find({ collection: 'projects', where: { slug: { equals: 'sample-cafe' } }, limit: 1 })
if (!cafe.docs[0]) {
  const frames = await Promise.all([1, 2, 3, 4].map((k) => placeholder(`Кафе ${k}`, tones[(k + 5) % 9])))
  await payload.create({
    collection: 'projects',
    data: {
      title: '[Пример] Кафе «Кирпич»',
      slug: 'sample-cafe',
      kind: 'public',
      cover: frames[0].id,
      onHome: true,
      homeOrder: 0,
      tags: tags.filter((t) => ['brick', 'moscow'].includes(t.slug)).map((t) => t.id),
      gallery: frames.map((m) => ({ image: m.id })),
      leadAuthor: author.id,
      summary: '[Пример общественного проекта: у него есть кнопка «Узнай стоимость».]',
    },
  })
  payload.logger.info('Sample project created: /projects/public/sample-cafe')
}
const studio = await payload.findGlobal({ slug: 'studio' })
if (!studio.mission) {
  const loft = await payload.find({ collection: 'projects', where: { slug: { equals: 'sample-loft' } }, limit: 1 })
  const eventImage = await placeholder('Событие', tones[4], 1200, 800)
  await payload.updateGlobal({
    slug: 'studio',
    data: {
      mission: '[Миссия студии: одно-два предложения о том, зачем студия существует.]',
      vision: '[Видение: куда движется студия, для кого работает и что отличает её подход.]',
      history: [
        { date: '2026-04-01', title: '[Последнее событие]', text: '[Короткий текст о событии со ссылкой на проект.]', image: eventImage.id, project: loft.docs[0]?.id },
        { date: '2023-01-01', title: '[Событие]', text: '[Текст события.]' },
        { date: '2020-01-01', title: '[Событие]', text: '[Текст события.]' },
        { date: '2017-01-01', title: '[Событие]', text: '[Текст события.]' },
        { date: '2014-01-01', title: '[Основание студии]', text: '[С чего всё началось.]' },
      ],
    },
  })
  payload.logger.info('Sample studio texts created: /studio')
}
// Page 4: the sample architect's interests and achievements
const architect = await payload.findByID({ collection: 'people', id: author.id })
if (!architect.interests) {
  const loftId = (await payload.find({ collection: 'projects', where: { slug: { equals: 'sample-loft' } }, limit: 1 })).docs[0]?.id
  const award = await placeholder('Награда', tones[6], 1200, 800)
  await payload.update({
    collection: 'people',
    id: author.id,
    data: {
      interests: '[Чем увлекается вне работы: 1–2 предложения.]',
      achievements: [
        { date: '2026-03-01', title: '[Награда или публикация]', text: '[Описание события со ссылкой на проект.]', image: award.id, project: loftId },
        { date: '2024-01-01', title: '[Событие]', text: '[Текст события.]' },
        { date: '2016-01-01', title: '[Пришёл в студию]' },
      ],
    },
  })
  payload.logger.info('Sample person filled: /team/sample-architect')
}
// Sample translations: a few English and Chinese texts, so the language switch shows translated
// and not-yet-translated content side by side (untranslated texts fall back to Russian)
const loftDoc = (await payload.find({ collection: 'projects', where: { slug: { equals: 'sample-loft' } }, limit: 1 })).docs[0]
const loftEn = loftDoc && (await payload.findByID({ collection: 'projects', id: loftDoc.id, locale: 'en', fallbackLocale: false }))
if (loftDoc && !loftEn?.title) {
  await payload.update({
    collection: 'projects',
    id: loftDoc.id,
    locale: 'en',
    data: { title: '[Sample] Loft on Solyanka', summary: '[2–3 sentences: the brief, floor area, district, timing. Sample for development.]' },
  })
  await payload.update({ collection: 'projects', id: loftDoc.id, locale: 'zh', data: { title: '[示例] 索良卡街的阁楼' } })
  await payload.update({
    collection: 'people',
    id: author.id,
    locale: 'en',
    data: { name: '[SURNAME Name]', role: 'Lead architect', quote: '[A smart thought: one line on how this person sees interiors.]' },
  })
  await payload.updateGlobal({
    slug: 'studio',
    locale: 'en',
    data: {
      mission: '[Studio mission: one or two sentences on why the studio exists.]',
      address: 'Solyanka St 1/2 bldg 2, Kitay-gorod metro, Moscow 119028',
    },
  })
  payload.logger.info('Sample translations added: /en/projects/residential/sample-loft, /en/studio')
}
// Home sliders 1.2 / 1.3: three more sample projects per side, so the slide show and its controls can be seen.
// Their tags give the tag filter 7.1 on pages 7 and 9 something to narrow.
const homeSamples = [
  ['sample-showroom', 'public', '[Пример] Шоурум мебели на Тверской', ['brick', 'moscow']],
  ['sample-office', 'public', '[Пример] Офис архитектурного бюро', ['minimal', 'moscow']],
  ['sample-restaurant', 'public', '[Пример] Ресторан «Дуб»', ['oak', 'brick']],
  ['sample-patriarshie', 'residential', '[Пример] Квартира у Патриарших', ['flat', 'moscow', 'minimal']],
  ['sample-house', 'residential', '[Пример] Дом в Подмосковье', ['oak', 'minimal']],
  ['sample-pokrovka', 'residential', '[Пример] Квартира-студия на Покровке', ['flat', 'moscow', 'loft']],
] as const
for (const [k, [slug, kind, title, tagSlugs]] of homeSamples.entries()) {
  const tagIds = tags.filter((t) => (tagSlugs as readonly string[]).includes(t.slug)).map((t) => t.id)
  const found = await payload.find({ collection: 'projects', where: { slug: { equals: slug } }, limit: 1 })
  if (found.docs[0]) {
    // Samples seeded before the tags existed get them now
    if (!found.docs[0].tags?.length) await payload.update({ collection: 'projects', id: found.docs[0].id, data: { tags: tagIds } })
    continue
  }
  const cover = await placeholder(title.replace('[Пример] ', ''), tones[(k + 2) % 9])
  await payload.create({
    collection: 'projects',
    data: {
      title,
      slug,
      kind,
      cover: cover.id,
      onHome: true,
      homeOrder: (k % 3) + 1,
      tags: tagIds,
      gallery: [{ image: cover.id }],
      summary: '[Пример проекта для слайдера на главной.]',
    },
  })
  payload.logger.info(`Sample project created: /projects/${kind}/${slug}`)
}
// Pages 6 and 10–15 (2026-10-26): sample partner details, an article, entries and texts
const furnitureDoc = await payload.findByID({ collection: 'partners', id: sofa.id, depth: 0 })
const loftForPartner = (await payload.find({ collection: 'projects', where: { slug: { equals: 'sample-loft' } }, limit: 1 })).docs[0]
if (!furnitureDoc.discount) {
  await payload.update({
    collection: 'partners',
    id: sofa.id,
    data: {
      text: toLexical('[Пример] Фабрика мебели из массива дуба. Делает мебель по чертежам студии.') as never,
      discount: '[Пример] −10% клиентам ID project',
      link: 'https://example.com/partner',
      projects: loftForPartner ? [loftForPartner.id] : [],
    },
  })
}
const texts = await payload.findGlobal({ slug: 'page-texts' })
if (!texts.payment) {
  await payload.updateGlobal({
    slug: 'page-texts',
    data: {
      gt: toLexical('[Пример] Get-Together — бонусная система студии: клиенты получают скидки у партнёров.') as never,
      payment: toLexical('[Пример] Оплата по договору.\n\n## Способы\n\n- безналичный перевод\n- оплата картой') as never,
    },
  })
}
if (!(await payload.find({ collection: 'press', limit: 1 })).docs.length) {
  await payload.create({
    collection: 'press',
    data: { title: '[Пример] Лофт на Солянке', source: '[Журнал]', date: '2026-03-01T00:00:00.000Z', url: 'https://example.com/article', project: loftForPartner?.id },
  })
}
const entrySamples = [
  ['lifestyle', 'sample-exhibition', '[Пример] Выставка в студии', '2026-09-12'],
  ['lifestyle', 'sample-trip', '[Пример] Поездка на Миланскую неделю дизайна', '2026-04-20'],
  ['careers', 'sample-designer', '[Пример] Дизайнер интерьеров', '2026-10-01'],
] as const
for (const [collection, slug, title, date] of entrySamples) {
  if ((await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1 })).docs.length) continue
  await payload.create({ collection, data: { slug, title, date: `${date}T00:00:00.000Z`, text: toLexical(`${title}: текст записи.`) as never } })
}
for (const d of legalDrafts) {
  if ((await payload.find({ collection: 'legal', where: { slug: { equals: d.slug } }, limit: 1 })).docs.length) continue
  await payload.create({ collection: 'legal', data: { slug: d.slug, title: d.title, date: '2026-10-26T00:00:00.000Z', text: toLexical(d.text) as never } })
}
process.exit(0)
