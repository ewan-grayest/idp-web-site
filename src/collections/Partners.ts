import type { CollectionConfig } from 'payload'

import { requiredInRussian } from './localized'
import { groups, tr } from './labels'
import { previewPartner } from './preview'

/**
 * Get-Together partners, page 6 (/partners): logo buttons 6.2.2 pick a partner, whose block 6.3 shows the text,
 * «Как получить», a wide photo, the discount and the projects 6.4. Shopping hotspots 5.1.3 and logo tiles 3.7.2 point here.
 */
export const Partners: CollectionConfig = {
  slug: 'partners',
  labels: { singular: { ru: 'Партнёр', en: 'Partner', zh: '合作伙伴' }, plural: { ru: 'Партнёры', en: 'Partners', zh: '合作伙伴' } },
  admin: {
    group: groups.pages,
    useAsTitle: 'name',
    preview: previewPartner,
    defaultColumns: ['name', 'discount', 'order'],
    description: tr(
      'Страница 6 (/partners). Описание бонусной системы Get-Together: «Тексты страниц» → «Партнёры».',
      'Page 6 (/partners). The Get-Together bonus scheme description is in «Тексты страниц» (Page texts) → «Партнёры».',
      '第 6 页（/partners）。Get-Together 积分计划的介绍在“页面文字”→“合作伙伴”。',
    ),
  },
  access: { read: () => true },
  defaultSort: 'order',
  fields: [
    { name: 'name', type: 'text', ...requiredInRussian, label: tr('Бренд', 'Brand', '品牌') },
    { name: 'slug', type: 'text', required: true, unique: true, index: true, label: tr('Адрес (slug)', 'Address (slug)', '网址 (slug)') },
    { name: 'logo', type: 'upload', relationTo: 'media', label: tr('Логотип: лучше SVG или PNG на прозрачном фоне', 'Logo: ideally SVG or PNG on a transparent background', '标志：最好是透明背景的 SVG 或 PNG') },
    { name: 'text', type: 'richText', localized: true, label: tr('О партнёре', 'About the partner', '合作伙伴介绍') },
    {
      name: 'link',
      type: 'text',
      label: tr('Сайт партнёра', "Partner's website", '合作伙伴网站'),
      validate: (v: string | null | undefined) => !v || /^https?:\/\/\S+$/.test(v) || 'https://…',
    },
    { name: 'photo', type: 'upload', relationTo: 'media', label: tr('Широкое фото проекта с партнёром', 'Wide photo of a project with the partner', '与合作伙伴的项目宽幅照片') },
    { name: 'discount', type: 'text', localized: true, label: tr('Скидка или особые условия', 'Discount or special terms', '折扣或特别条件') },
    {
      name: 'projects',
      type: 'relationship',
      relationTo: 'projects',
      hasMany: true,
      label: tr('Проекты', 'Projects', '项目'),
      admin: { description: tr('Проекты, где партнёр отмечен на фото, добавляются сами.', 'Projects where the partner is tagged on a photo are added automatically.', '照片中标记了该合作伙伴的项目会自动加入。') },
    },
    { name: 'tags', type: 'relationship', relationTo: 'tags', hasMany: true, label: tr('Теги', 'Tags', '标签') },
    { name: 'order', type: 'number', defaultValue: 0, label: tr('Порядок', 'Order', '排序'), admin: { position: 'sidebar' } },
  ],
}
