import type { CollectionConfig } from 'payload'

import { requiredInRussian } from './localized'
import { groups, tr } from './labels'
import { makeShortCode } from '../lib/shortCode'

type Names = { singular: Record<'ru' | 'en' | 'zh', string>; plural: Record<'ru' | 'en' | 'zh', string> }

/**
 * Pages 11, 13 and 14 share one layout (spec slide 3): a vertical timeline of entries, the newest on top,
 * and the picked entry's title 11.1.1, photos 11.1.2 (scroll sideways) and text 11.1.3.
 * Each page keeps its entries in its own admin section built here.
 */
export function entries(slug: string, labels: Names, page: { id: number; path: string }, dateLabel = tr('Дата', 'Date', '日期')): CollectionConfig {
  return {
    slug,
    labels,
    admin: {
      group: groups.pages,
      useAsTitle: 'title',
      defaultColumns: ['title', 'date', 'updatedAt'],
      description: tr(
        `Страница ${page.id} (${page.path}): записи на вертикальной шкале, новые сверху.`,
        `Page ${page.id} (${page.path}): entries on a vertical timeline, newest on top.`,
        `第 ${page.id} 页（${page.path}）：竖向时间轴上的条目，最新的在上。`,
      ),
    },
    access: { read: () => true },
    defaultSort: '-date',
    ...(page.id === 11 ? { hooks: { beforeChange: [({ data, originalDoc }) => ({ ...data, shortCode: originalDoc?.shortCode || data.shortCode || `j-${makeShortCode()}` })] } } : {}),
    fields: [
      ...(page.id === 11 ? [{ name: 'shortCode', type: 'text' as const, unique: true, index: true, admin: { readOnly: true, position: 'sidebar' as const }, label: 'Short URL' }] : []),
      { name: 'title', type: 'text', ...requiredInRussian, label: tr('Заголовок', 'Title', '标题') },
      {
        name: 'slug',
        type: 'text',
        required: true,
        unique: true,
        index: true,
        label: tr('Адрес (slug)', 'Address (slug)', '网址 (slug)'),
        admin: {
          description: tr(
            `Латиницей, без пробелов: запись откроется по ссылке ${page.path}#slug`,
            `Latin letters, no spaces: the entry opens at ${page.path}#slug`,
            `拉丁字母，无空格：条目可通过 ${page.path}#slug 打开`,
          ),
        },
        validate: (v: string | null | undefined) => (!!v && /^[a-z0-9-]+$/.test(v)) || 'a-z, 0-9, -',
      },
      { name: 'date', type: 'date', required: true, label: dateLabel, admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMMM yyyy' } } },
      { name: 'images', type: 'upload', relationTo: 'media', hasMany: true, label: tr('Изображения (листаются вбок)', 'Images (scroll sideways)', '图片（横向滚动）') },
      { name: 'text', type: 'richText', localized: true, label: tr('Текст', 'Text', '正文') },
    ],
  }
}

export const Lifestyle = entries(
  'lifestyle',
  {
    singular: { ru: 'Запись «Стиль жизни»', en: 'Lifestyle entry', zh: '生活方式条目' },
    plural: { ru: 'Стиль жизни', en: 'Lifestyle', zh: '生活方式' },
  },
  { id: 11, path: '/journal' },
)

export const Careers = entries(
  'careers',
  {
    singular: { ru: 'Вакансия', en: 'Vacancy', zh: '职位' },
    plural: { ru: 'Работайте с нами', en: 'Work with us', zh: '加入我们' },
  },
  { id: 13, path: '/careers' },
)

export const LegalDocs = entries(
  'legal',
  {
    singular: { ru: 'Документ', en: 'Document', zh: '文件' },
    plural: { ru: 'Юридические документы', en: 'Legal documents', zh: '法律文件' },
  },
  { id: 14, path: '/legal' },
  tr('Дата редакции', 'Version date', '版本日期'),
)
