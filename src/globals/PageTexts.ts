import type { GlobalConfig } from 'payload'

import { groups, tr } from '../collections/labels'

const body = (name: string, label: Record<'ru' | 'en' | 'zh', string>) => ({ name, type: 'richText' as const, localized: true, label })

/** Texts of the pages that are one text each: Get-Together 6.1.2, Payment 12.1 and Media and PR 15.1. */
export const PageTexts: GlobalConfig = {
  slug: 'page-texts',
  label: { ru: 'Тексты страниц', en: 'Page texts', zh: '页面文字' },
  admin: { group: groups.pages },
  access: { read: () => true },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: tr('Партнёры', 'Partners', '合作伙伴'),
          description: tr('/partners, под заголовком «Бонусная система Get-Together»', '/partners, under «Бонусная система Get-Together»', '/partners，“Get-Together 积分计划”标题下'),
          fields: [body('gt', tr('Описание бонусной системы Get-Together', 'Get-Together bonus scheme', 'Get-Together 积分计划介绍'))],
        },
        {
          label: tr('Оплата', 'Payment', '付款'),
          description: '/payment',
          fields: [body('payment', tr('Способы оплаты', 'Payment options', '付款方式'))],
        },
        {
          label: tr('СМИ и PR', 'Media and PR', '媒体与公关'),
          description: '/media',
          fields: [body('media', tr('Работа со СМИ и PR', 'Media and PR', '媒体与公关'))],
        },
      ],
    },
  ],
}
