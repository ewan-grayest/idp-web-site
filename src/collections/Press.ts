import type { CollectionConfig } from 'payload'

import { requiredInRussian } from './localized'
import { groups, tr } from './labels'

/** Page 10 «О нас пишут»: articles about the studio, a sideways slider of wide photos 10.2 with the source and date 10.4. */
export const Press: CollectionConfig = {
  slug: 'press',
  labels: {
    singular: { ru: 'Публикация', en: 'Article', zh: '报道' },
    plural: { ru: 'О нас пишут', en: 'Press', zh: '媒体报道' },
  },
  admin: {
    group: groups.pages,
    useAsTitle: 'title',
    defaultColumns: ['title', 'source', 'date'],
    description: tr('Страница 10 (/press): статьи о студии, новые слева.', 'Page 10 (/press): articles about the studio, newest on the left.', '第 10 页（/press）：关于工作室的文章，最新的在左。'),
  },
  access: { read: () => true },
  defaultSort: '-date',
  fields: [
    { name: 'title', type: 'text', ...requiredInRussian, label: tr('Заголовок статьи', 'Article title', '文章标题') },
    { name: 'source', type: 'text', ...requiredInRussian, label: tr('Издание (10.4)', 'Publication (10.4)', '媒体 (10.4)') },
    { name: 'date', type: 'date', required: true, label: tr('Дата публикации', 'Publication date', '发布日期'), admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMMM yyyy' } } },
    {
      name: 'url',
      type: 'text',
      label: tr('Ссылка на статью', 'Link to the article', '文章链接'),
      admin: { description: tr('Откроется в новой вкладке.', 'Opens in a new tab.', '在新标签页中打开。') },
      validate: (v: string | null | undefined) => !v || /^https?:\/\/\S+$/.test(v) || 'https://…',
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
      label: tr('Широкое фото (10.2)', 'Wide photo (10.2)', '宽幅照片 (10.2)'),
      admin: { description: tr('Если пусто, берётся первое фото проекта.', "If empty, the project's first photo is used.", '留空时使用项目的第一张照片。') },
    },
    { name: 'project', type: 'relationship', relationTo: 'projects', label: tr('Проект в статье', 'Project in the article', '文章中的项目') },
  ],
}
