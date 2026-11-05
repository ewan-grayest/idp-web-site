import type { CollectionConfig } from 'payload'

import { requiredInRussian } from './localized'
import { groups, tr } from './labels'
import { previewPerson } from './preview'

/** Studio team members: the strip on page 3 (3.2) and the Person page 4. */
export const People: CollectionConfig = {
  slug: 'people',
  labels: { singular: { ru: 'Сотрудник', en: 'Person', zh: '成员' }, plural: { ru: 'Команда', en: 'People', zh: '团队成员' } },
  admin: {
    group: groups.projects,
    useAsTitle: 'name',
    defaultColumns: ['name', 'role', 'onTeam', 'order'],
    // «Предпросмотр» opens the person's own page 4, where the achievements 4.2 show
    preview: previewPerson,
    description: tr(
      'Сотрудники: лента на странице «Наша команда» и личная страница каждого. Миссия и «Наша история» страницы «Наша команда» — в разделе «Наша команда: миссия, история, контакты».',
      'Team members: the strip on the «Our team» page and each person\'s own page. The mission and «Our history» of the «Our team» page are in «Our team: mission, history, contacts».',
      '成员：“我们的团队”页面上的横条和每个人的个人页面。“我们的团队”页面的使命和“我们的历史”在“我们的团队：使命、历史、联系方式”中编辑。',
    ),
  },
  access: { read: () => true },
  defaultSort: 'order',
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: tr('Основное', 'Main', '基本信息'),
          fields: [
            { name: 'name', type: 'text', ...requiredInRussian, label: tr('Имя', 'Name', '姓名') },
            { name: 'slug', type: 'text', required: true, unique: true, index: true, label: tr('Адрес (slug)', 'Address (slug)', '网址 (slug)') },
            { name: 'role', type: 'text', localized: true, label: tr('Должность', 'Position', '职位') },
            { name: 'portrait', type: 'upload', relationTo: 'media', label: tr('Портрет вертикальный (для ленты «Наша команда»)', 'Vertical portrait (for the «Our team» strip)', '竖版肖像（“我们的团队”横条）') },
            { name: 'photo', type: 'upload', relationTo: 'media', label: tr('Широкое фото; если его нет — берётся портрет', 'Wide photo; the portrait is used if empty', '宽幅照片；留空时使用肖像') },
            { name: 'quote', type: 'textarea', localized: true, label: tr('Умная мысль или цитата', 'Quote', '语录') },
            { name: 'interests', type: 'textarea', localized: true, label: tr('Интересы', 'Interests', '兴趣') },
            { name: 'socialHashtag', type: 'text', label: 'Instagram hashtag' },
            // 3.2.2: people are tagged, so the strip can show e.g. only the team of one project or one skill
            { name: 'tags', type: 'relationship', relationTo: 'tags', hasMany: true, label: tr('Теги и интересы', 'Tags and interests', '标签、兴趣') },
          ],
        },
        {
          label: tr('Достижения', 'Achievements', '成就'),
          description: tr(
            'Показываются на личной странице сотрудника (/team/адрес), раздел «Мои достижения», и ссылкой из его карточки на странице «Наша команда». Кнопка «Предпросмотр» вверху открывает эту страницу.',
            'Shown on the person\'s own page (/team/address) under «My achievements», and linked from their card on the «Our team» page. The «Preview» button at the top opens that page.',
            '显示在成员的个人页面 (/team/地址) 的“我的成就”部分，并在“我们的团队”页面的成员卡片中提供链接。顶部的“预览”按钮可打开该页面。',
          ),
          fields: [
            {
              name: 'achievements',
              type: 'array',
              label: tr('События (на шкале новые слева)', 'Events (newest on the left of the timeline)', '事件（时间轴上最新的在左）'),
              labels: { singular: tr('Событие', 'Event', '事件'), plural: tr('События', 'Events', '事件') },
              fields: [
                { name: 'date', type: 'date', required: true, label: tr('Дата', 'Date', '日期') },
                { name: 'title', type: 'text', ...requiredInRussian, label: tr('Событие', 'Event', '事件') },
                { name: 'text', type: 'textarea', localized: true, label: tr('Текст', 'Text', '文字') },
                { name: 'image', type: 'upload', relationTo: 'media', label: tr('Изображение', 'Image', '图片') },
                { name: 'project', type: 'relationship', relationTo: 'projects', label: tr('Ссылка на проект (5 / 8 / 16)', 'Link to a project (5 / 8 / 16)', '项目链接（5、8 或 16）') },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'onTeam',
      type: 'checkbox',
      defaultValue: true,
      label: tr('Показывать в ленте «Наша команда»', 'Show in the «Наша команда» (Our team) strip', '在“我们的团队”横条中显示'),
      admin: { position: 'sidebar' },
    },
    { name: 'order', type: 'number', defaultValue: 0, label: tr('Порядок в ленте', 'Order in the strip', '横条中的顺序'), admin: { position: 'sidebar' } },
  ],
}
