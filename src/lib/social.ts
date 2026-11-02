import { getPayload, type Where } from 'payload'
import config from '@payload-config'
import { getLocale } from '@/i18n/server'
import { mediaUrl } from './projects'
import { getSettings } from './settings'

export type FeedScope = 'studio' | 'person' | 'project' | 'partners'

export const normalizeHashtag = (value: string) => value.trim().replace(/^#/, '').toLowerCase()

export async function getSocialPosts(scope: FeedScope, entity?: number, hashtag?: string | null) {
  const [payload, settings, locale] = await Promise.all([getPayload({ config }), getSettings(), getLocale()])
  if (settings.feedsEnabled === false) return []
  const cap = { studio: settings.limits.studioPosts, person: settings.limits.personPosts, partners: settings.limits.partnerPosts, project: settings.limits.projectPosts }[scope]
  const where: Where[] = [{ scope: { equals: scope } }, { published: { equals: true } }]
  if (scope === 'person' || scope === 'project') {
    if (!entity) return []
    where.push({ [scope]: { equals: entity } })
  }
  const selected = normalizeHashtag(hashtag || (scope === 'studio' ? settings.studioHashtag : scope === 'partners' ? settings.partnerHashtag : '') || '')
  // Filter exact hashtag tokens before applying the cap, avoiding partial matches such as #art / #apartment.
  const { docs } = await payload.find({ collection: 'social-posts', locale, where: { and: where }, depth: 1, sort: '-date', pagination: false, overrideAccess: false })
  return docs.filter((post) => !selected || (post.hashtags ?? '').split(/[\s,]+/).map(normalizeHashtag).includes(selected)).slice(0, cap).map((post) => ({
    id: post.id, caption: post.caption ?? '', url: post.url, image: mediaUrl(post.image), date: post.date,
  }))
}

export async function getReviews(project: number) {
  const [payload, settings] = await Promise.all([getPayload({ config }), getSettings()])
  if (settings.reviewsEnabled === false) return []
  const { docs } = await payload.find({ collection: 'reviews', where: { project: { equals: project }, approved: { equals: true } }, sort: '-date', limit: settings.limits.latestReviews, depth: 0, overrideAccess: false })
  return docs.map((r) => ({ id: r.id, name: r.name, text: r.text, date: r.date, network: r.network ?? 'vk', sourceUrl: r.sourceUrl }))
}
