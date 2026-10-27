import type { CollectionConfig } from 'payload'

import { localeNames, locales } from '../i18n/locales'
import { groups, tr } from './labels'

/**
 * Enquiries from header control 0.1.7–0.1.10 and entity-specific CTAs.
 * Stored in Russia (Yandex Cloud) per the hosting decision.
 * Anyone may create a lead (with consent); only signed-in staff can read them.
 */
export const Leads: CollectionConfig = {
  slug: 'leads',
  labels: { singular: { ru: 'Заявка', en: 'Lead', zh: '咨询' }, plural: { ru: 'Заявки', en: 'Leads', zh: '咨询' } },
  admin: { group: groups.service, useAsTitle: 'email', defaultColumns: ['email', 'context', 'locale', 'originUrl', 'createdAt'] },
  access: {
    create: () => true,
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'email', type: 'email', required: true, label: tr('E-mail', 'Email', '电子邮件') },
    {
      name: 'consent',
      type: 'checkbox',
      required: true,
      label: tr('Согласие на обработку персональных данных (0.1.9)', 'Consent to personal data processing (0.1.9)', '同意处理个人数据 (0.1.9)'),
      validate: (value: boolean | null | undefined) =>
        value === true || 'Нужно согласие на обработку персональных данных',
    },
    { name: 'originUrl', type: 'text', required: true, label: tr('Страница отправки заявки', 'Page the enquiry came from', '咨询来源页面') },
    {
      name: 'context',
      type: 'text',
      label: tr('Контекст запроса', 'Enquiry context', '咨询内容'),
      admin: {
        description: tr(
          'Например «Заказать звонок · Наша команда» или «Узнать стоимость»',
          'For example «Заказать звонок · Наша команда» (call back) or «Узнать стоимость» (ask the price)',
          '例如 «Заказать звонок · Наша команда»（回电）或 «Узнать стоимость»（询价）',
        ),
      },
    },
    {
      name: 'entity',
      type: 'group',
      label: tr('Объект заявки', 'Enquiry about', '咨询对象'),
      fields: [
        {
          name: 'type',
          type: 'select',
          label: tr('Тип', 'Type', '类型'),
          options: [
            { value: 'page', label: tr('Страница', 'Page', '页面') },
            { value: 'project', label: tr('Проект', 'Project', '项目') },
            { value: 'person', label: tr('Сотрудник', 'Person', '成员') },
            { value: 'partner', label: tr('Партнёр', 'Partner', '合作伙伴') },
          ],
        },
        { name: 'ref', type: 'text', label: tr('slug или id', 'slug or id', 'slug 或 id') },
      ],
    },
    {
      name: 'locale',
      type: 'select',
      label: tr('Язык сайта при отправке', 'Site language it was written in', '提交时的网站语言'),
      options: locales.map((l) => ({ label: localeNames[l], value: l })),
      admin: { position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      label: tr('Статус', 'Status', '状态'),
      options: [
        { value: 'new', label: tr('Новая', 'New', '新') },
        { value: 'in-progress', label: tr('В работе', 'In progress', '处理中') },
        { value: 'done', label: tr('Готово', 'Done', '已完成') },
      ],
      // Visitors can't set the status of their own enquiry
      access: { create: ({ req }) => Boolean(req.user) },
    },
  ],
}
