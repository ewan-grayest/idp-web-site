import type { Access, CollectionConfig, FieldAccess } from 'payload'

import { localeNames, locales } from '../i18n/locales'
import {
  clientIp,
  CONSENT_RETENTION_DAYS,
  consentWording,
  docsFor,
  documentVersions,
  toLocale,
  type ConsentDecision,
  type ConsentPurpose,
} from '../lib/consentLog'
import { groups, tr } from './labels'

const staff: FieldAccess = ({ req }) => Boolean(req.user)

/** Staff may delete a record only once it has been kept for the retention period. */
const deleteOld: Access = ({ req }) =>
  req.user ? { createdAt: { less_than: new Date(Date.now() - CONSENT_RETENTION_DAYS * 86_400_000).toISOString() } } : false

const readOnly = { readOnly: true }

/**
 * «Журнал согласий»: proof that a visitor ticked a consent box or made a cookie choice (152-ФЗ, ч. 3 ст. 9).
 * Lead and review records are written by their hooks (src/lib/consentLog.ts). The cookie banner posts its choice
 * here; everything but the choice, page and language is filled in on the server, so a visitor can't forge a record.
 * Nobody can edit a record; staff can delete one only after CONSENT_RETENTION_DAYS (a year and a day).
 */
export const Consents: CollectionConfig = {
  slug: 'consents',
  labels: {
    singular: tr('Согласие', 'Consent record', '同意记录'),
    plural: tr('Журнал согласий', 'Consent log', '同意记录日志'),
  },
  admin: {
    group: groups.service,
    useAsTitle: 'subject',
    defaultColumns: ['createdAt', 'purpose', 'decision', 'subject', 'ip', 'source'],
    description: tr(
      'Доказательство согласий посетителей: время, IP-адрес, браузер, страница, текст согласия и версии документов. Записи не редактируются; удалить запись можно не раньше чем через год.',
      'Proof of visitors’ consent: time, IP address, browser, page, consent wording and document versions. Records cannot be edited and can be deleted only after a year.',
      '访客同意的证明：时间、IP 地址、浏览器、页面、同意文本和文件版本。记录不可编辑，一年后方可删除。',
    ),
  },
  disableDuplicate: true,
  defaultSort: '-createdAt',
  access: {
    // Visitors (the cookie banner) and server hooks; staff can't add records by hand
    create: ({ req }) => !req.user,
    read: ({ req }) => Boolean(req.user),
    update: () => false,
    delete: deleteOld,
  },
  hooks: {
    beforeChange: [
      async ({ data, req, operation, context }) => {
        if (operation !== 'create') return data
        const fromServer = context?.consentFromServer === true
        const purpose: ConsentPurpose = fromServer ? data.purpose : 'cookies'
        const decision: ConsentDecision = fromServer ? 'agree' : data.decision === 'agree' ? 'agree' : 'necessary-only'
        const locale = toLocale(data.locale)
        return {
          purpose,
          decision,
          locale,
          source: fromServer ? data.source : 'cookie-banner',
          sourceId: fromServer ? data.sourceId : null,
          subject: fromServer ? String(data.subject ?? '').slice(0, 320) : null,
          originUrl: String(data.originUrl ?? '').slice(0, 2000),
          wording: consentWording(purpose, decision, locale),
          documents: await documentVersions(req, docsFor(purpose), locale),
          ip: clientIp(req.headers),
          userAgent: (req.headers?.get('user-agent') ?? '').slice(0, 1000),
          createdAt: new Date().toISOString(),
        }
      },
    ],
  },
  fields: [
    {
      name: 'purpose',
      type: 'select',
      required: true,
      label: tr('Согласие на', 'Consent to', '同意内容'),
      options: [
        { value: 'personal-data', label: tr('Обработку персональных данных', 'Personal data processing', '处理个人数据') },
        { value: 'publication', label: tr('Публикацию имени и отзыва', 'Publishing name and review', '公开姓名和评论') },
        { value: 'cookies', label: tr('Cookie и сторонние сервисы', 'Cookies and third-party services', 'Cookie 和第三方服务') },
      ],
      admin: readOnly,
    },
    {
      name: 'decision',
      type: 'select',
      required: true,
      label: tr('Решение', 'Decision', '决定'),
      options: [
        { value: 'agree', label: tr('Согласие', 'Agreed', '同意') },
        { value: 'necessary-only', label: tr('Только необходимые cookie', 'Necessary cookies only', '仅必要 Cookie') },
      ],
      admin: readOnly,
    },
    { name: 'subject', type: 'text', label: tr('E-mail или имя', 'Email or name', '电子邮件或姓名'), admin: readOnly },
    {
      name: 'source',
      type: 'select',
      required: true,
      label: tr('Откуда', 'Source', '来源'),
      options: [
        { value: 'lead', label: tr('Заявка', 'Lead', '咨询') },
        { value: 'review', label: tr('Отзыв', 'Review', '评论') },
        { value: 'cookie-banner', label: tr('Уведомление о cookie', 'Cookie notice', 'Cookie 通知') },
      ],
      admin: readOnly,
    },
    { name: 'sourceId', type: 'text', label: tr('Номер заявки или отзыва', 'Lead or review number', '咨询或评论编号'), admin: readOnly },
    { name: 'wording', type: 'textarea', label: tr('Текст у галочки или кнопки', 'Wording next to the box or button', '复选框或按钮旁的文字'), admin: readOnly },
    {
      name: 'documents',
      type: 'json',
      label: tr('Версии документов', 'Document versions', '文件版本'),
      admin: {
        ...readOnly,
        description: tr(
          'Документы из «Юридические документы», показанные посетителю: дата изменения и отпечаток текста (SHA-256). Прежние тексты хранятся в истории версий документа.',
          'Documents from «Legal documents» shown to the visitor: last change and text fingerprint (SHA-256). Earlier texts are kept in each document’s version history.',
          '向访客展示的「法律文件」：修改日期和文本指纹 (SHA-256)。旧文本保存在文件的版本历史中。',
        ),
      },
    },
    { name: 'originUrl', type: 'text', label: tr('Страница', 'Page', '页面'), admin: readOnly },
    {
      name: 'locale',
      type: 'select',
      label: tr('Язык сайта', 'Site language', '网站语言'),
      options: locales.map((l) => ({ label: localeNames[l], value: l })),
      admin: readOnly,
    },
    { name: 'ip', type: 'text', label: tr('IP-адрес', 'IP address', 'IP 地址'), access: { read: staff }, admin: readOnly },
    { name: 'userAgent', type: 'textarea', label: tr('Браузер (User-Agent)', 'Browser (User-Agent)', '浏览器 (User-Agent)'), access: { read: staff }, admin: readOnly },
  ],
}
