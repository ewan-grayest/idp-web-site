import type { GlobalConfig } from 'payload'

import { groups, tr } from '../collections/labels'

const body = (name: string, label: Record<'ru' | 'en' | 'zh', string>) => ({ name, type: 'richText' as const, localized: true, label })

/** Texts of the pages that are one text each: Get-Together 6.1.2, Payment 12.1 and Media and PR 15.1. */
export const PageTexts: GlobalConfig = {
  slug: 'page-texts',
  label: { ru: 'Тексты страниц (6, 12, 15)', en: 'Page texts (6, 12, 15)', zh: '页面文字 (6, 12, 15)' },
  admin: { group: groups.pages },
  access: { read: () => true },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: tr('Партнёры 6', 'Partners 6', '合作伙伴 6'),
          description: tr('/partners, под заголовком «Бонусная система Get-Together»', '/partners, under «Бонусная система Get-Together»', '/partners，“Get-Together 积分计划”标题下'),
          fields: [body('gt', tr('Описание бонусной системы Get-Together (6.1.2)', 'Get-Together bonus scheme (6.1.2)', 'Get-Together 积分计划介绍 (6.1.2)'))],
        },
        {
          label: tr('Оплата 12', 'Payment 12', '付款 12'),
          description: '/payment',
          fields: [body('payment', tr('Способы оплаты (12.1)', 'Payment options (12.1)', '付款方式 (12.1)'))],
        },
        {
          label: tr('СМИ и PR 15', 'Media and PR 15', '媒体与公关 15'),
          description: '/media',
          fields: [body('media', tr('Работа со СМИ и PR (15.1)', 'Media and PR (15.1)', '媒体与公关 (15.1)'))],
        },
      ],
    },
  ],
}
