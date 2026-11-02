import type { CollectionConfig, RelationshipFieldSingleValidation } from 'payload'
import { groups, tr } from './labels'
import { requiredInRussian } from './localized'

const requireEntity = (scope: string): RelationshipFieldSingleValidation => (value, { siblingData }) =>
  (siblingData as { scope?: string })?.scope !== scope || Boolean(value) || `Choose a ${scope}`

/** Approved feed items: curated in CMS or synced by an authenticated provider integration. No browser token. */
export const SocialPosts: CollectionConfig = {
  slug: 'social-posts',
  labels: { singular: tr('Социальная публикация', 'Social post', '社交帖子'), plural: tr('Социальные ленты', 'Social feeds', '社交动态') },
  admin: { group: groups.pages, useAsTitle: 'caption', defaultColumns: ['caption', 'scope', 'date', 'published'] },
  access: { read: ({ req }) => req.user ? true : { published: { equals: true } }, create: ({ req }) => Boolean(req.user), update: ({ req }) => Boolean(req.user), delete: ({ req }) => Boolean(req.user) },
  fields: [
    { name: 'caption', type: 'textarea', ...requiredInRussian, label: tr('Подпись', 'Caption', '说明') },
    { name: 'date', type: 'date', required: true, label: tr('Дата', 'Date', '日期') },
    { name: 'url', type: 'text', required: true, label: 'Instagram · URL', validate: (v: string | null | undefined) => Boolean(v && /^https:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[^\s]+$/.test(v)) || 'https://www.instagram.com/p/…' },
    { name: 'image', type: 'upload', relationTo: 'media', required: true, label: tr('Изображение', 'Image', '图片') },
    { name: 'scope', type: 'select', required: true, options: ['studio', 'person', 'project', 'partners'], label: tr('Раздел', 'Section', '栏目') },
    { name: 'person', type: 'relationship', relationTo: 'people', admin: { condition: (_, s) => s.scope === 'person' }, validate: requireEntity('person') },
    { name: 'project', type: 'relationship', relationTo: 'projects', admin: { condition: (_, s) => s.scope === 'project' }, validate: requireEntity('project') },
    { name: 'hashtags', type: 'text', label: tr('Хэштеги через запятую', 'Comma-separated hashtags', '以逗号分隔的话题标签') },
    { name: 'published', type: 'checkbox', defaultValue: false, label: tr('Опубликовано', 'Published', '已发布') },
  ],
}
