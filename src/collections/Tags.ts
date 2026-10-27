import type { CollectionConfig } from 'payload'

import { requiredInRussian } from './localized'
import { groups, tr } from './labels'

/** Shared tags connecting projects, people and partners (5.3.1, filter 7.1). */
export const Tags: CollectionConfig = {
  slug: 'tags',
  labels: { singular: { ru: 'Тег', en: 'Tag', zh: '标签' }, plural: { ru: 'Теги', en: 'Tags', zh: '标签' } },
  admin: { group: groups.projects, useAsTitle: 'title' },
  access: { read: () => true },
  fields: [
    { name: 'title', type: 'text', ...requiredInRussian, label: tr('Тег', 'Tag', '标签') },
    { name: 'slug', type: 'text', required: true, unique: true, index: true, label: tr('Адрес (slug)', 'Address (slug)', '网址 (slug)') },
  ],
}
