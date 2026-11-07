import type { GlobalConfig, TextFieldSingleValidation } from 'payload'
import { groups, tr } from '../collections/labels'
import { defaultLimits } from '../lib/limits'

const validateVK: TextFieldSingleValidation = (value, { siblingData }) =>
  (!(siblingData as { vkEnabled?: boolean })?.vkEnabled && !value) || /^\d+$/.test(value || '') || 'Numeric public site ID'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: tr('Настройки сайта и интеграции', 'Site settings and integrations', '网站设置与集成'),
  admin: { group: groups.pages },
  access: { read: () => true, update: ({ req }) => Boolean(req.user) },
  fields: [
    { name: 'limits', type: 'group', label: tr('Лимиты', 'Limits', '数量限制'), fields: Object.entries(defaultLimits).map(([name, defaultValue]) => ({
      name, type: 'number' as const, defaultValue, required: true, min: 1, max: 100,
      label: ({ maxTags: 'Tags', studioPosts: 'Studio posts', personPosts: 'Person posts', partnerPosts: 'GT posts', projectPosts: 'Project posts', latestReviews: 'Latest reviews' } as Record<string, string>)[name],
      validate: (v: number | null | undefined) => (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 100) || '1–100, integer',
    })) },
    // 152-ФЗ: Google Maps would pass visitors' IP addresses abroad, so the site always shows Yandex Maps (src/components/studio/StudioMap.tsx).
    // The field stays in the database for older backups, but is no longer offered
    { name: 'mapProvider', type: 'select', defaultValue: 'yandex', required: true, label: tr('Карты', 'Maps', '地图'), options: [{ label: 'Yandex', value: 'yandex' }, { label: 'Google', value: 'google' }], admin: { hidden: true } },
    { name: 'feedsEnabled', type: 'checkbox', defaultValue: true, label: tr('Показывать социальные ленты', 'Show social feeds', '显示社交动态') },
    { name: 'reviewsEnabled', type: 'checkbox', defaultValue: true, label: tr('Показывать отзывы', 'Show reviews', '显示评论') },
    { name: 'studioHashtag', type: 'text', label: 'Hashtag' },
    { name: 'partnerHashtag', type: 'text', label: 'Hashtag' },
    { name: 'defaultNetwork', type: 'select', defaultValue: 'vk', options: ['vk', 'facebook'], label: tr('Соцсеть по умолчанию', 'Default social network', '默认社交网络') },
    { name: 'vkEnabled', type: 'checkbox', defaultValue: false, label: tr('Включить интеграцию VK', 'Enable VK integration', '启用 VK 集成') },
    { name: 'vkAppId', type: 'text', label: 'VK · Site / app ID', admin: { condition: (_, sibling) => sibling.vkEnabled === true }, validate: validateVK },
    { name: 'facebookAppId', type: 'text', label: 'Facebook · App ID', admin: { description: tr('Не используется: виджет комментариев Facebook отключён (152-ФЗ, трансграничная передача данных).', 'Not used: the Facebook comments widget is off (Russian personal data law, cross-border transfer).', '未使用：Facebook 评论组件已关闭（俄罗斯个人数据法，跨境传输）。') }, validate: (v: string | null | undefined) => !v || /^\d+$/.test(v) || 'Numeric public app ID' },
  ],
}
