import type { CollectionConfig } from 'payload'
import { dataDirs } from '../lib/dataDirs'
import { groups, tr } from './labels'

/** Panoramic project photography and portraits. */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: { ru: 'Файл', en: 'Media', zh: '媒体' }, plural: { ru: 'Фото и видео', en: 'Media', zh: '媒体' } },
  admin: {
    group: groups.service,
    defaultColumns: ['filename', 'alt', 'tags', 'updatedAt'],
    components: {
      // Above the list: square thumbnails as before, or each in its own proportions (Ewan, 2026-11-20)
      beforeListTable: ['/components/admin/media/ThumbModeSwitch#ThumbModeSwitch'],
    },
  },
  access: { read: () => true },
  upload: {
    // /data/media in every container; media/ in the site folder for `npm run dev` (lib/dataDirs.ts)
    staticDir: dataDirs().media,
    mimeTypes: ['image/*', 'video/mp4', 'video/webm'],
    imageSizes: [
      { name: 'thumb', width: 640 },
      { name: 'wide', width: 1920 },
      { name: 'panorama', width: 2880 },
    ],
  },
  fields: [
    {
      // Payload's own file name column, drawn by our cell: the thumbnail in the chosen mode and a full screen button
      // (Ewan, 2026-11-20). Merged into Payload's `filename` field, so nothing about the stored file changes
      name: 'filename',
      type: 'text',
      label: tr('Файл', 'File', '文件'),
      admin: { components: { Cell: '/components/admin/media/MediaCell#MediaCell' } },
    },
    {
      // Optional (Ewan, 2026-10-25): an empty description falls back to the project's name on the page
      name: 'alt',
      type: 'text',
      localized: true,
      label: tr('Описание (alt)', 'Description (alt)', '描述 (alt)'),
      admin: {
        description: tr(
          'Необязательно: коротко, что на фото. Если пусто, сайт подставит название проекта.',
          'Optional: what the photo shows, in a few words. If empty, the site uses the project name.',
          '可选：简要说明照片内容。留空时网站使用项目名称。',
        ),
      },
    },
    {
      // The site's shared tags, for search engines (keywords of the photo on project pages) and, when ticked below,
      // for visitors in the photo viewer (Ewan, 2026-11-20)
      name: 'tags',
      type: 'relationship',
      relationTo: 'tags',
      hasMany: true,
      label: tr('Теги', 'Tags', '标签'),
      admin: {
        description: tr(
          'Для поисковиков: сайт передаёт их как ключевые слова фото на страницах проектов. Посетителям видны, только если отмечено ниже.',
          'For search engines: the site gives them as the photo’s keywords on project pages. Visitors see them only if ticked below.',
          '用于搜索引擎：网站在项目页面中将其作为照片的关键词。只有勾选下方选项时访客才能看到。',
        ),
      },
    },
    {
      name: 'showTags',
      type: 'checkbox',
      defaultValue: false,
      label: tr('Показывать теги на сайте', 'Show the tags on the site', '在网站上显示标签'),
      admin: {
        description: tr(
          'Под фото в полноэкранном просмотре проекта; каждый тег открывает проекты с ним.',
          'Under the photo in a project’s full screen viewer; each tag opens the projects that have it.',
          '显示在项目全屏查看器中的照片下方；每个标签打开带有该标签的项目。',
        ),
      },
    },
    {
      // What each place on the site shows of the photo, around the focal point the site now crops to (Ewan, 2026-11-20)
      name: 'cropGrid',
      type: 'ui',
      label: tr('Кадрирование на сайте', 'Cropping on the site', '网站上的裁切'),
      admin: { components: { Field: '/components/admin/media/CropGrid#CropGrid' } },
    },
  ],
}
