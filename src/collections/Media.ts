import type { CollectionConfig } from 'payload'
import { groups, tr } from './labels'

/** Panoramic project photography and portraits. */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: { ru: 'Файл', en: 'Media', zh: '媒体' }, plural: { ru: 'Фото и видео', en: 'Media', zh: '媒体' } },
  admin: { group: groups.service },
  access: { read: () => true },
  upload: {
    // MEDIA_DIR: where uploads are kept (a folder or a mounted disk); by default "media" in the site folder.
    // In Docker the app always writes to /app/media and the compose files map that to MEDIA_DIR on the host
    staticDir: process.env.MEDIA_DIR || 'media',
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
