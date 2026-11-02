import type { CollectionConfig } from 'payload'
import { groups, tr } from './labels'

/** Studio editors who sign in to /admin. */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: { ru: 'Пользователь', en: 'User', zh: '用户' }, plural: { ru: 'Пользователи', en: 'Users', zh: '用户' } },
  admin: { group: groups.service, useAsTitle: 'email' },
  auth: true,
  fields: [{ name: 'name', type: 'text', label: tr('Имя', 'Name', '姓名') }],
}
