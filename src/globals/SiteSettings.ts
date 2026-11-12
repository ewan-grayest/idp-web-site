import type { Field, GlobalConfig, PayloadRequest, TextFieldSingleValidation } from 'payload'

import type { Locale } from '../i18n/locales'
import { groups, tr } from '../collections/labels'
import { defaultLimits } from '../lib/limits'
import { slideNameModes, type SlideNameMode } from '../lib/slideNames'

/** A validation message in the editor's admin language (Payload shows a custom one as it is). */
const inAdminLanguage = (req: PayloadRequest | undefined, text: Record<Locale, string>) =>
  text[req?.i18n?.language as Locale] ?? text.ru

const digitsOnly = tr('Только цифры', 'Digits only', '仅限数字')

const validateVK: TextFieldSingleValidation = (value, { siblingData, req }) =>
  (!(siblingData as { vkEnabled?: boolean })?.vkEnabled && !value) || /^\d+$/.test(value || '') || inAdminLanguage(req, digitsOnly)

/** Each number in «Лимиты», where the site uses it. Defaults and bounds: src/lib/limits.ts */
const limitTexts: Record<keyof typeof defaultLimits, { label: Record<Locale, string>; description: Record<Locale, string> }> = {
  maxTags: {
    label: tr('Теги в фильтре проектов', 'Tags in the project filter', '项目筛选中的标签'),
    description: tr(
      'Сколько тегов посетитель может выбрать сразу: «Жилые интерьеры», «Общественные интерьеры» и ID Lab.',
      'How many tags a visitor can pick at once: residential and public interiors, and ID Lab.',
      '访客一次最多可选的标签数：住宅、公共空间和 ID Lab。',
    ),
  },
  studioPosts: {
    label: tr('Посты в ленте студии', 'Posts in the studio feed', '工作室动态帖子'),
    description: tr('Страница «Студия» (/studio).', 'The Studio page (/studio).', '“工作室”页面 (/studio)。'),
  },
  personPosts: {
    label: tr('Посты в ленте сотрудника', 'Posts in a team member’s feed', '成员动态帖子'),
    description: tr('Страница каждого сотрудника.', 'Each team member’s page.', '每位成员的页面。'),
  },
  partnerPosts: {
    label: tr('Посты в ленте Get-Together', 'Posts in the Get-Together feed', 'Get-Together 动态帖子'),
    description: tr('Страница «Партнёры» (/partners).', 'The Partners page (/partners).', '“合作伙伴”页面 (/partners)。'),
  },
  projectPosts: {
    label: tr('Посты в ленте проекта', 'Posts in a project’s feed', '项目动态帖子'),
    description: tr('Страница каждого проекта.', 'Each project’s page.', '每个项目的页面。'),
  },
  latestReviews: {
    label: tr('Отзывы на странице проекта', 'Reviews on a project page', '项目页面上的评论'),
    description: tr('Сколько последних одобренных отзывов показать.', 'How many of the latest approved reviews to show.', '显示最近几条已审核的评论。'),
  },
}

const wholeNumber = tr('Целое число от 1 до 100', 'A whole number from 1 to 100', '1 到 100 之间的整数')

const limit = (name: keyof typeof defaultLimits): Field => ({
  name,
  type: 'number',
  defaultValue: defaultLimits[name],
  required: true,
  min: 1,
  max: 100,
  label: limitTexts[name].label,
  admin: { description: limitTexts[name].description, step: 1, width: '50%' },
  validate: (v: number | null | undefined, { req }: { req: PayloadRequest }) =>
    (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 100) || inAdminLanguage(req, wholeNumber),
})

const slideNameLabels: Record<SlideNameMode, Record<Locale, string>> = {
  project: tr('Как задано в каждом проекте', 'As set on each project', '按各项目的设置'),
  show: tr('Показывать на всех слайдах', 'Show on every slide', '所有幻灯片都显示'),
  hide: tr('Скрывать на всех слайдах', 'Hide on every slide', '所有幻灯片都隐藏'),
}

/**
 * Site-wide switches: names on the Home slides, social feeds, reviews and the VK widget, and the limits from the spec
 * (7.1.2, 3.8, 4.5, 6.7, 5.12, 5.9.2). Tabs only group the form: the data keeps its flat shape, so older backups and the
 * API are unchanged.
 */
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: tr('Настройки сайта и интеграции', 'Site settings and integrations', '网站设置与集成'),
  admin: { group: groups.pages },
  access: { read: () => true, update: ({ req }) => Boolean(req.user) },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: tr('Главная', 'Home', '首页'),
          fields: [
            {
              // Overrides each project's «Показывать название на слайде главной» (Ewan, 2026-11-12)
              name: 'homeSlideNames',
              type: 'radio',
              required: true,
              defaultValue: 'project',
              label: tr('Названия проектов на слайдах главной', 'Project names on the Home slides', '首页幻灯片上的项目名称'),
              options: slideNameModes.map((value) => ({ value, label: slideNameLabels[value] })),
              admin: {
                layout: 'vertical',
                description: tr(
                  'Перекрывает галочку «Показывать название на слайде главной» в каждом проекте. Без названия на слайде остаются фото и «Смотреть проект»; название по-прежнему есть на странице проекта и в списках, а программы чтения с экрана его называют.',
                  'Overrides the «Показывать название на слайде главной» (show the name on the Home slide) tick on each project. Without the name a slide keeps its photo and «Смотреть проект» (view project); the name still shows on the project page and in lists, and screen readers still read it.',
                  '覆盖每个项目中的“Показывать название на слайде главной”（在首页幻灯片上显示名称）勾选项。不显示名称时，幻灯片保留照片和“Смотреть проект”（查看项目）；项目页面和列表中仍显示名称，读屏软件也仍会读出。',
                ),
              },
            },
          ],
        },
        {
          label: tr('Ленты соцсетей', 'Social feeds', '社交动态'),
          description: tr(
            'Посты из раздела «Социальные ленты»: на страницах «Студия», «Партнёры», сотрудников и проектов.',
            'Posts from «Социальные ленты» (social feeds): on the Studio and Partners pages and on team member and project pages.',
            '来自“Социальные ленты”（社交动态）的帖子：显示在“工作室”“合作伙伴”、成员和项目页面上。',
          ),
          fields: [
            {
              name: 'feedsEnabled',
              type: 'checkbox',
              defaultValue: true,
              label: tr('Показывать ленты соцсетей', 'Show social feeds', '显示社交动态'),
              admin: { description: tr('Выключено: ни одна страница не показывает ленту.', 'Off: no page shows a feed.', '关闭后：所有页面都不显示动态。') },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'studioHashtag',
                  type: 'text',
                  label: tr('Хэштег ленты студии', 'Studio feed hashtag', '工作室动态话题标签'),
                  admin: {
                    width: '50%',
                    description: tr(
                      'Необязательно. Лента на странице «Студия» покажет только посты с этим хэштегом. Пусто: все посты студии.',
                      'Optional. The feed on the Studio page shows only posts with this hashtag. Empty: every studio post.',
                      '可选。“工作室”页面的动态只显示带此话题标签的帖子。留空：显示所有工作室帖子。',
                    ),
                  },
                },
                {
                  name: 'partnerHashtag',
                  type: 'text',
                  label: tr('Хэштег ленты Get-Together', 'Get-Together feed hashtag', 'Get-Together 动态话题标签'),
                  admin: {
                    width: '50%',
                    description: tr(
                      'Необязательно. То же для ленты на странице «Партнёры». Хэштеги сотрудников и проектов задаются в их карточках.',
                      'Optional. The same for the feed on the Partners page. Team members and projects have their own hashtag field.',
                      '可选。同样适用于“合作伙伴”页面的动态。成员和项目的话题标签在各自的资料中设置。',
                    ),
                  },
                },
              ],
            },
          ],
        },
        {
          label: tr('Отзывы и VK', 'Reviews and VK', '评论与 VK'),
          description: tr(
            'Раздел «Отзывы о проекте» на странице проекта.',
            'The «Отзывы о проекте» (project reviews) section of a project page.',
            '项目页面上的“Отзывы о проекте”（项目评论）栏目。',
          ),
          fields: [
            {
              name: 'reviewsEnabled',
              type: 'checkbox',
              defaultValue: true,
              label: tr('Показывать отзывы', 'Show reviews', '显示评论'),
              admin: {
                description: tr(
                  'Выключено: на страницах проектов нет ни отзывов, ни формы отзыва.',
                  'Off: project pages show neither reviews nor the review form.',
                  '关闭后：项目页面既不显示评论，也不显示评论表单。',
                ),
              },
            },
            {
              name: 'defaultNetwork',
              type: 'radio',
              defaultValue: 'vk',
              label: tr('Соцсеть по умолчанию', 'Default social network', '默认社交网络'),
              options: [
                { label: 'VK', value: 'vk' },
                { label: 'Facebook', value: 'facebook' },
              ],
              admin: {
                layout: 'horizontal',
                condition: (data) => data?.reviewsEnabled !== false,
                description: tr(
                  'Отзывы какой сети открыты сразу. Посетитель может переключить, и браузер запомнит его выбор.',
                  'Whose reviews show first. A visitor can switch, and their browser remembers the choice.',
                  '默认先显示哪个网络的评论。访客可以切换，浏览器会记住其选择。',
                ),
              },
            },
            {
              name: 'vkEnabled',
              type: 'checkbox',
              defaultValue: false,
              label: tr('Комментарии VK под отзывами', 'VK comments under the reviews', '评论下方的 VK 评论'),
              admin: {
                condition: (data) => data?.reviewsEnabled !== false,
                description: tr(
                  'Добавляет кнопку «Открыть комментарии в социальной сети». Виджет VK загружается с vk.com только после нажатия, с предупреждением о cookie VK.',
                  'Adds an «Открыть комментарии в социальной сети» (open social comments) button. The VK widget loads from vk.com only once it is pressed, with a note on VK’s cookies.',
                  '添加“Открыть комментарии в социальной сети”（打开社交评论）按钮。VK 组件仅在点击后才从 vk.com 加载，并附有关于 VK Cookie 的提示。',
                ),
              },
            },
            {
              name: 'vkAppId',
              type: 'text',
              label: tr('ID сайта или приложения в VK', 'VK site or app ID', 'VK 网站或应用 ID'),
              admin: {
                condition: (data, sibling) => data?.reviewsEnabled !== false && sibling?.vkEnabled === true,
                description: tr(
                  'Число, которое VK выдаёт сайту при подключении виджетов. Без него кнопка не появится.',
                  'The number VK gives the site when its widgets are connected. Without it the button does not appear.',
                  'VK 在网站接入组件时分配的数字。没有它按钮不会出现。',
                ),
              },
              validate: validateVK,
            },
            // 152-ФЗ: the Facebook comments widget is off (cross-border transfer, Meta is banned in Russia), so the ID is
            // no longer offered. The field stays in the database for older backups
            {
              name: 'facebookAppId',
              type: 'text',
              admin: { hidden: true },
              validate: (v: string | null | undefined, { req }: { req: PayloadRequest }) => !v || /^\d+$/.test(v) || inAdminLanguage(req, digitsOnly),
            },
          ],
        },
        {
          label: tr('Лимиты', 'Limits', '数量限制'),
          description: tr(
            'Сколько показывать за раз: целые числа от 1 до 100.',
            'How many to show at once: whole numbers from 1 to 100.',
            '每次显示的数量：1 到 100 之间的整数。',
          ),
          fields: [
            {
              name: 'limits',
              type: 'group',
              label: false,
              fields: [
                { type: 'row', fields: [limit('studioPosts'), limit('personPosts')] },
                { type: 'row', fields: [limit('partnerPosts'), limit('projectPosts')] },
                { type: 'row', fields: [limit('latestReviews'), limit('maxTags')] },
              ],
            },
          ],
        },
      ],
    },
    // 152-ФЗ: Google Maps would pass visitors' IP addresses abroad, so the site always shows Yandex Maps (src/components/studio/StudioMap.tsx).
    // The field stays in the database for older backups, but is no longer offered
    { name: 'mapProvider', type: 'select', defaultValue: 'yandex', required: true, label: tr('Карты', 'Maps', '地图'), options: [{ label: 'Yandex', value: 'yandex' }, { label: 'Google', value: 'google' }], admin: { hidden: true } },
  ],
}
