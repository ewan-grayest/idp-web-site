import type { CollectionConfig } from 'payload'
import { groups, tr } from './labels'

/** Moderated local reviews or approved copies with a link to their original social discussion. */
export const Reviews: CollectionConfig = {
  slug: 'reviews',
  labels: { singular: tr('Отзыв', 'Review', '评论'), plural: tr('Отзывы', 'Reviews', '评论') },
  admin: { group: groups.pages, useAsTitle: 'name', defaultColumns: ['name', 'project', 'network', 'approved', 'createdAt'] },
  access: { read: ({ req }) => req.user ? true : { approved: { equals: true } }, create: () => true, update: ({ req }) => Boolean(req.user), delete: ({ req }) => Boolean(req.user) },
  hooks: { beforeChange: [({ data, req, operation }) => {
    if (!req.user && operation === 'create') { data.approved = false; data.date = new Date().toISOString(); data.sourceUrl = null }
    return data
  }] },
  fields: [
    { name: 'name', type: 'text', required: true, maxLength: 100, label: tr('Имя', 'Name', '姓名') },
    { name: 'text', type: 'textarea', required: true, minLength: 10, maxLength: 3000, label: tr('Отзыв', 'Review', '评论') },
    { name: 'project', type: 'relationship', relationTo: 'projects', required: true },
    { name: 'network', type: 'select', options: ['vk', 'facebook'], defaultValue: 'vk', required: true },
    { name: 'sourceUrl', type: 'text', label: tr('Ссылка на оригинал', 'Original review URL', '原始评论网址'), access: { create: ({ req }) => Boolean(req.user) }, validate: (v: string | null | undefined) => !v || /^https:\/\/(www\.)?(vk\.com|vk\.ru|facebook\.com)\//.test(v) || 'VK / Facebook HTTPS URL' },
    { name: 'date', type: 'date', defaultValue: () => new Date().toISOString(), required: true },
    { name: 'consent', type: 'checkbox', required: true, access: { read: ({ req }) => Boolean(req.user) }, validate: (v: boolean | null | undefined) => v === true || 'Consent is required' },
    { name: 'originUrl', type: 'text', required: true, maxLength: 2000, access: { read: ({ req }) => Boolean(req.user) } },
    { name: 'approved', type: 'checkbox', defaultValue: false, access: { create: ({ req }) => Boolean(req.user), update: ({ req }) => Boolean(req.user) } },
  ],
}
