/** Run only against the isolated idp_spec_qa database and localhost:3001. Creates clearly marked QA fixtures. */
import assert from 'node:assert/strict'
import { getPayload } from 'payload'
import config from '../src/payload.config'

assert(process.env.DATABASE_URI?.endsWith('/idp_spec_qa'), 'Use the isolated idp_spec_qa database')
const payload = await getPayload({ config })
const origin = 'http://localhost:3001'
const results: string[] = []
const ok = (label: string) => { results.push(label); console.log(`PASS · ${label}`) }
const project = (await payload.find({ collection: 'projects', where: { slug: { equals: 'sample-cafe' } }, depth: 0, limit: 1 })).docs[0]
const person = (await payload.find({ collection: 'people', where: { slug: { equals: 'sample-architect' } }, depth: 0, limit: 1 })).docs[0]
const image = (await payload.find({ collection: 'media', depth: 0, limit: 1 })).docs[0]
assert(project && person && image, 'Run scripts/seed.ts in QA first')
const html = async (path: string) => {
  const response = await fetch(origin + path, { headers: { 'Accept-Language': 'ru' } })
  assert.equal(response.status, 200, path)
  return response.text()
}
const countFeed = (source: string) => (source.match(/class="[^"]*Social-module__[^"]*post"/g) ?? []).length
const api = async (path: string, data?: unknown) => fetch(origin + '/api/v1/' + path, data ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {})

try {
  await payload.updateGlobal({ slug: 'site-settings', data: { limits: { maxTags: 5, studioPosts: 12, personPosts: 12, partnerPosts: 12, projectPosts: 3, latestReviews: 5 }, vkEnabled: false, vkAppId: '123456', feedsEnabled: true, reviewsEnabled: true, studioHashtag: '', partnerHashtag: '', mapProvider: 'yandex' } })
  // These rows exist only in the explicitly named QA database.
  await payload.delete({ collection: 'social-posts', where: { url: { contains: '/p/idp-qa-' } } })
  await payload.delete({ collection: 'reviews', where: { name: { equals: 'QA reviewer' } } })
  for (const scope of ['studio', 'person', 'partners', 'project'] as const) {
    for (let n = 0; n < 15; n++) await payload.create({ collection: 'social-posts', data: { scope, caption: `QA feed ${scope} ${n}`, date: new Date(Date.UTC(2026, 9, n + 1)).toISOString(), image: image.id, url: `https://www.instagram.com/p/idp-qa-${scope}-${n}/`, published: true, hashtags: n % 2 ? '#architecture' : '#art', ...(scope === 'person' ? { person: person.id } : {}), ...(scope === 'project' ? { project: project.id } : {}) } })
  }
  for (let n = 0; n < 8; n++) {
    const review = await payload.create({ collection: 'reviews', data: { name: 'QA reviewer', text: `QA review ${n}: a detailed review of this interior.`, project: project.id, date: new Date(Date.UTC(2026, 9, n + 1)).toISOString(), consent: true, originUrl: origin, network: 'vk' } })
    await payload.update({ collection: 'reviews', id: review.id, data: { approved: true } })
  }
  for (const path of ['/', '/promo', '/studio', '/team/sample-architect', '/projects/residential', '/projects/public', '/projects/archive', '/projects/residential/sample-loft', '/projects/public/sample-cafe', '/partners', '/press', '/journal', '/payment', '/careers', '/legal', '/media', '/en/studio', '/zh/studio']) await html(path)
  ok('all page roles and RU / EN / ZH routes respond')
  const home = await html('/')
  assert(home.includes('data-spec="1.1"')); assert(home.includes('href="/promo"')); assert(!home.includes('data-spec="0.1"'))
  assert(!(await html('/promo')).includes('data-spec="0.1"'))
  ok('Home/Promo shell and logo destination')
  const counts: [string, number][] = [['/studio', 12], ['/team/sample-architect', 12], ['/partners', 12], ['/projects/public/sample-cafe', 3]]
  for (const [path, expected] of counts) assert.equal(countFeed(await html(path)), expected, `feed cap ${path}`)
  ok('default social feed caps 12 / 12 / 12 / 3')
  let source = await html('/projects/public/sample-cafe')
  assert.equal((source.match(/class="[^"]*Social-module__[^"]*review"/g) ?? []).length, 5)
  assert(!source.includes('vk.com/js/api/openapi.js')); assert(!source.includes('Открыть комментарии в социальной сети'))
  ok('latest reviews capped at 5; VK disabled even with a stored app ID')
  await payload.updateGlobal({ slug: 'site-settings', data: { limits: { maxTags: 2, studioPosts: 4, personPosts: 4, partnerPosts: 4, projectPosts: 1, latestReviews: 2 }, studioHashtag: '#art', mapProvider: 'google' } })
  source = await html('/studio')
  // 152-ФЗ: a stored Google choice still shows Yandex Maps, and only after the visitor's consent (nothing in the server HTML)
  assert.equal(countFeed(source), 4); assert(!source.includes('maps.google.com')); assert(!/<iframe[^>]*map-widget/.test(source)); assert(source.includes('data-third-party="blocked"'))
  assert.equal(countFeed(await html('/projects/public/sample-cafe')), 1)
  const filtered = await html('/projects/residential?tags=flat,moscow,minimal,loft')
  assert(filtered.includes('Выбрано 2 из 2'))
  ok('custom caps, exact hashtag filtering, no Google Maps, map waits for consent, direct-URL tag cap')
  const review = { name: 'QA reviewer', text: 'QA anonymous review awaiting moderation.', project: project.id, consent: true, publicationConsent: true, network: 'vk', originUrl: origin, approved: true }
  const created = await api('reviews', review); assert.equal(created.status, 201)
  const createdDoc = (await created.json()).doc
  const stored = await payload.findByID({ collection: 'reviews', id: createdDoc.id })
  assert.equal(stored.approved, false)
  assert.equal((await api(`reviews/${createdDoc.id}`)).status, 404)
  const publicReviews = await (await api('reviews?limit=100')).json()
  assert(publicReviews.docs.every((r: { consent?: boolean; publicationConsent?: boolean; originUrl?: string; approved: boolean }) => r.approved && r.consent === undefined && r.publicationConsent === undefined && r.originUrl === undefined))
  assert.equal((await api('reviews', { ...review, consent: false })).status, 400)
  assert.equal((await api('reviews', { ...review, publicationConsent: false })).status, 400)
  const reviewConsents = await payload.find({ collection: 'consents', where: { and: [{ source: { equals: 'review' } }, { sourceId: { equals: String(createdDoc.id) } }] }, depth: 0 })
  assert.deepEqual(reviewConsents.docs.map((c) => c.purpose).sort(), ['personal-data', 'publication'])
  ok('review moderation cannot be bypassed; both consents required and logged; origin and consent remain private')
  const lead = await api('leads', { email: 'qa@example.test', consent: true, context: 'Price request · QA café', originUrl: `${origin}/projects/public/sample-cafe`, entity: { type: 'project', ref: 'sample-cafe' }, locale: 'en' })
  assert.equal(lead.status, 201)
  const leadId = (await lead.json()).doc.id
  const storedLead = await payload.findByID({ collection: 'leads', id: leadId })
  assert.equal(storedLead.entity?.ref, 'sample-cafe'); assert.equal(storedLead.context, 'Price request · QA café'); assert.equal(storedLead.locale, 'en')
  assert.equal((await api('leads', { email: 'qa@example.test', consent: false, originUrl: origin })).status, 400)
  assert([401, 403].includes((await api('leads')).status))
  const leadConsent = (await payload.find({ collection: 'consents', where: { and: [{ source: { equals: 'lead' } }, { sourceId: { equals: String(leadId) } }] }, depth: 0 })).docs[0]
  assert.equal(leadConsent?.purpose, 'personal-data'); assert.equal(leadConsent?.subject, 'qa@example.test'); assert(leadConsent?.ip)
  assert([401, 403].includes((await api('consents')).status))
  ok('context-aware leads are saved with email, consent, origin, entity and language; staff-only read')
  assert(source.includes('data-spec="0.3.7"')); assert(!source.includes('href="#"'))
  const sitemap = await html('/sitemap.xml'); assert(sitemap.includes('/projects/archive')); assert(sitemap.includes('/team/sample-architect'))
  assert.equal((await fetch(origin + '/projects/public/no-such-project/deep', { headers: { 'Accept-Language': 'ru' } })).status, 404)
  const team = await fetch(origin + '/team', { redirect: 'manual', headers: { 'Accept-Language': 'ru' } }); assert.equal(team.status, 308)
  const journal = await payload.create({ collection: 'lifestyle', data: { slug: `qa-short-${Date.now()}`, title: 'QA short permalink', date: new Date().toISOString() } })
  const short = await fetch(`${origin}/p/${journal.shortCode}`, { redirect: 'manual', headers: { 'Accept-Language': 'ru' } })
  assert.equal(short.status, 308); assert(short.headers.get('location')?.endsWith(`/journal#${journal.slug}`))
  ok('sitemap, strict 404s, team alias and editorial short links')
} finally {
  await payload.updateGlobal({ slug: 'site-settings', data: { limits: { maxTags: 5, studioPosts: 12, personPosts: 12, partnerPosts: 12, projectPosts: 3, latestReviews: 5 }, vkEnabled: false, vkAppId: '', studioHashtag: '', mapProvider: 'yandex' } })
}
console.log(`Verified ${results.length} specification groups against isolated QA data.`)
process.exit(0)
