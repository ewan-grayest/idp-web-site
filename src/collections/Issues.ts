import type { CollectionConfig } from 'payload'

import { requiredInRussian } from './localized'
import { groups, tr } from './labels'

/** Online journal issues (3.4): covers in a sideways strip, newest first; a cover opens the magazine online when it has a link. */
export const Issues: CollectionConfig = {
  slug: 'issues',
  labels: {
    singular: { ru: 'Выпуск журнала', en: 'Journal issue', zh: '杂志期刊' },
    plural: { ru: 'Online журнал', en: 'Online journal', zh: '在线杂志' },
  },
  admin: { group: groups.pages, useAsTitle: 'title', defaultColumns: ['title', 'number', 'date'] },
  access: { read: () => true },
  defaultSort: '-date',
  fields: [
    { name: 'title', type: 'text', ...requiredInRussian, label: tr('Название выпуска', 'Issue title', '期刊标题') },
    { name: 'number', type: 'number', required: true, label: tr('Номер', 'Number', '期号') },
    { name: 'date', type: 'date', required: true, label: tr('Дата выхода', 'Publication date', '出版日期'), admin: { date: { pickerAppearance: 'monthOnly' } } },
    { name: 'cover', type: 'upload', relationTo: 'media', label: tr('Обложка (вертикальная)', 'Cover (portrait)', '封面（竖版）') },
    {
      name: 'link',
      type: 'text',
      label: tr('Ссылка на журнал online (Joomag и т. п.)', 'Link to the online magazine (Joomag etc.)', '在线杂志链接（Joomag 等）'),
      admin: {
        description: tr(
          'Если указана, клик по обложке открывает журнал в новой вкладке, а «Получить экземпляр» остаётся под обложкой. Без ссылки клик по обложке открывает заявку «Получить экземпляр».',
          'If set, a click on the cover opens the magazine in a new tab and «Получить экземпляр» (get a copy) stays under the cover. Without a link the cover opens the «Получить экземпляр» enquiry.',
          '填写后，点击封面将在新标签页中打开杂志，封面下方保留“索取一本”。未填写时，点击封面打开“索取一本”申请。',
        ),
      },
      validate: (v: string | null | undefined) => !v || /^https?:\/\/\S+$/.test(v) || 'https://…',
    },
  ],
}
