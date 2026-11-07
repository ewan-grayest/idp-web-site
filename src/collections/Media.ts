import type { CollectionConfig } from 'payload'
import { dataDirs } from '../lib/dataDirs'
import { groups, tr } from './labels'

/** Panoramic project photography and portraits. */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: { ru: 'Файл', en: 'Media', zh: '媒体' }, plural: { ru: 'Фото и видео', en: 'Media', zh: '媒体' } },
  admin: { group: groups.service },
  access: { read: () => true },
  upload: {
    // /data/media in every container; data/media in the site folder for `npm run dev` (lib/dataDirs.ts)
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
  ],
}
