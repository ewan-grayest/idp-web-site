import type { GlobalConfig } from 'payload'

import { partnersEmail, partnersPhone, social, studioEmail, studioPhone } from '../lib/site'

import { requiredInRussian } from '../collections/localized'
import { groups, tr } from '../collections/labels'
import { previewTeamPage } from '../collections/preview'

/**
 * Studio content that is not people, issues or partners: the promo video and how it plays (page 2, also the first-visit
 * intro on Home)
 * and page 3: mission 3.1, history 3.3, address and map 3.5; the contacts and social links in the header, menu and footer;
 * the company details on the Legal page 14. Empty contacts fall back to the ones in src/lib/site.ts.
 */
export const Studio: GlobalConfig = {
  slug: 'studio',
  // Named after the page Ewan sees: «Наша история» was hard to find under «Студия» (2026-10-26)
  label: {
    ru: 'Наша команда: миссия, история, контакты, реквизиты',
    en: 'Our team: mission, history, contacts, company details',
    zh: '我们的团队：使命、历史、联系方式、公司信息',
  },
  admin: { group: groups.pages, preview: previewTeamPage },
  access: { read: () => true },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: tr('Промо-видео', 'Promo video', '宣传视频'),
          fields: [
            {
              name: 'promoVideo',
              type: 'upload',
              relationTo: 'media',
              label: tr('Видеопрезентация', 'Video presentation', '视频介绍'),
              filterOptions: { mimeType: { contains: 'video' } },
              admin: {
                description: tr(
                  'Показывается на главной при первом визите и по адресу /promo; как именно, задают переключатели ниже. Когда видео закончилось, его закрыли или по нему нажали, открывается главная. MP4 (H.264) работает во всех браузерах. Пока файла нет, показывается заглушка.',
                  'Shows over Home on a visitor\'s first visit and at /promo; the switches below set how. When it ends, is closed or is clicked, Home opens. MP4 (H.264) works in every browser. Until a file is added, a placeholder plays.',
                  '访客首次访问时在首页播放，也可在 /promo 观看；播放方式由下方开关设置。视频播放结束、被关闭或被点击后显示首页。MP4 (H.264) 适用于所有浏览器。未上传文件时播放占位视频。',
                ),
              },
            },
            // Ewan, 2026-10-28: all three on by default, as the site behaved before
            {
              name: 'introOnFirstVisit',
              type: 'checkbox',
              defaultValue: true,
              label: tr('Показывать на главной при первом визите', 'Show over Home on the first visit', '首次访问时在首页播放'),
              admin: {
                description: tr(
                  'Выключено: главная открывается сразу, видео остаётся на /promo. Проверить показ можно по адресу /?intro.',
                  'Off: Home opens straight away and the video stays at /promo. /?intro shows it anyway, to check it.',
                  '关闭后首页直接打开，视频仍可在 /promo 观看。访问 /?intro 可随时预览。',
                ),
              },
            },
            {
              name: 'promoAutoplay',
              type: 'checkbox',
              defaultValue: true,
              label: tr('Запускать само (иначе по нажатию)', 'Start by itself (otherwise on a click or tap)', '自动播放（否则点击后播放）'),
            },
            {
              name: 'promoSound',
              type: 'checkbox',
              defaultValue: true,
              label: tr('Со звуком', 'With sound', '有声音'),
              admin: {
                description: tr(
                  'Браузеры не дают видео самому начать со звуком, пока посетитель ничего не нажал: тогда оно идёт без звука с подсказкой, и звук включается от первого нажатия. Выключено: видео идёт без звука, его можно включить кнопкой.',
                  'Browsers do not let a video start with sound by itself until the visitor has clicked or tapped: it then plays muted with a hint, and the first click or tap turns the sound on. Off: the video plays muted and the sound button turns it on.',
                  '在访客点击之前，浏览器不允许视频自动带声音播放：此时视频静音播放并显示提示，首次点击即开启声音。关闭后视频静音播放，可用声音按钮开启。',
                ),
              },
            },
            // Ewan, 2026-11-12: what the visitor sees until the video starts, the first frame unless an image is chosen
            {
              name: 'promoBackground',
              type: 'radio',
              defaultValue: 'frame',
              label: tr('Фон до начала видео', 'Background until the video starts', '视频开始前的背景'),
              options: [
                { value: 'frame', label: tr('Первый кадр видео', 'The first frame of the video', '视频第一帧') },
                { value: 'image', label: tr('Картинку (JPG, PNG, WebP или GIF)', 'An image (JPG, PNG, WebP or GIF)', '图片（JPG、PNG、WebP 或 GIF）') },
              ],
              admin: {
                layout: 'vertical',
                description: tr(
                  'На весь экран под кнопкой воспроизведения: пока видео загружается, ждёт нажатия или браузер не запускает его сам.',
                  'Full-screen under the play button: while the video loads, waits for a click, or the browser does not start it by itself.',
                  '全屏显示在播放按钮下方：视频加载中、等待点击或浏览器未自动播放时显示。',
                ),
              },
            },
            {
              name: 'promoBackgroundImage',
              type: 'upload',
              relationTo: 'media',
              required: true,
              label: tr('Фоновая картинка', 'Background image', '背景图片'),
              filterOptions: { mimeType: { contains: 'image' } },
              admin: {
                condition: (_, sibling) => sibling?.promoBackground === 'image',
                description: tr(
                  'Заполняет экран, как видео. GIF двигается; посетители, которые попросили систему уменьшить движение, видят его первый кадр.',
                  'Fills the screen, as the video does. A GIF moves; visitors who asked their system for less motion see its first frame.',
                  '像视频一样铺满屏幕。GIF 会动；系统设置为减少动态效果的访客只看到其第一帧。',
                ),
              },
            },
          ],
        },
        {
          label: tr('Миссия', 'Mission', '使命'),
          fields: [
            { name: 'mission', type: 'textarea', localized: true, label: tr('Миссия (крупный текст)', 'Mission (large text)', '使命（大字）') },
            { name: 'vision', type: 'textarea', localized: true, label: tr('Видение', 'Vision', '愿景') },
          ],
        },
        {
          label: tr('Наша история', 'Our history', '我们的历史'),
          description: tr(
            'Шкала «Наша история» на странице «Наша команда» (/studio). Личные достижения сотрудников — в «Команда» → сотрудник → «Достижения».',
            'The «Our history» timeline on the «Our team» page (/studio). Each person\'s own achievements are in «People» → the person → «Achievements».',
            '“我们的团队”页面 (/studio) 上的“我们的历史”时间轴。成员个人成就在“团队成员”→成员→“成就”中编辑。',
          ),
          fields: [
            {
              name: 'history',
              type: 'array',
              label: tr('События (на шкале новые слева)', 'Events (newest on the left of the timeline)', '事件（时间轴上最新的在左）'),
              labels: { singular: tr('Событие', 'Event', '事件'), plural: tr('События', 'Events', '事件') },
              fields: [
                { name: 'date', type: 'date', required: true, label: tr('Дата', 'Date', '日期') },
                { name: 'title', type: 'text', ...requiredInRussian, label: tr('Событие', 'Event', '事件') },
                { name: 'text', type: 'textarea', localized: true, label: tr('Текст', 'Text', '文字') },
                { name: 'image', type: 'upload', relationTo: 'media', label: tr('Изображение', 'Image', '图片') },
                { name: 'project', type: 'relationship', relationTo: 'projects', label: tr('Ссылка на проект', 'Link to a project', '项目链接') },
              ],
            },
          ],
        },
        {
          label: tr('Контакты', 'Contacts', '联系方式'),
          fields: [
            {
              name: 'address',
              type: 'textarea',
              localized: true,
              label: tr('Адрес', 'Address', '地址'),
              defaultValue: '119028, Москва, Басманный район (ЦАО), м. Китай-город, ул. Солянка, 1/2, стр. 2',
            },
            {
              type: 'row',
              fields: [
                // ASSUMPTION: approximate point for Solyanka 1/2 bld 2; check it on the map in the admin preview
                { name: 'lat', type: 'number', label: tr('Широта', 'Latitude', '纬度'), defaultValue: 55.7533 },
                { name: 'lng', type: 'number', label: tr('Долгота', 'Longitude', '经度'), defaultValue: 37.6366 },
                { name: 'zoom', type: 'number', label: tr('Масштаб', 'Zoom', '缩放'), defaultValue: 16, min: 3, max: 19 },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'phone', type: 'text', label: tr('Телефон (шапка и контакты)', 'Phone (header and contacts)', '电话（页眉、联系方式）'), admin: { placeholder: studioPhone } },
                { name: 'email', type: 'email', label: tr('E-mail', 'E-mail', '电子邮箱'), admin: { placeholder: studioEmail } },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'partnersPhone', type: 'text', label: tr('Телефон для партнёров', 'Partnerships phone', '合作电话'), admin: { placeholder: partnersPhone } },
                { name: 'partnersEmail', type: 'email', label: tr('E-mail для партнёров', 'Partnerships e-mail', '合作邮箱'), admin: { placeholder: partnersEmail } },
              ],
            },
            {
              name: 'social',
              type: 'group',
              label: tr('Соцсети (подвал)', 'Social links (footer)', '社交链接（页脚）'),
              admin: { description: tr('Пустая ссылка: берётся адрес по умолчанию.', 'An empty link keeps the default address.', '留空则使用默认地址。') },
              fields: social.map((s) => ({
                name: s.key,
                type: 'text' as const,
                label: s.key === 'vk' ? 'VK' : s.key[0].toUpperCase() + s.key.slice(1),
                admin: { placeholder: s.href },
                validate: (v: string | null | undefined) => !v || /^https?:\/\/\S+$/.test(v) || 'https://…',
              })),
            },
          ],
        },
        {
          label: tr('Реквизиты', 'Company details', '公司信息'),
          description: tr(
            'Показываются первыми на странице «Юридические аспекты» (/legal#details). Пустые поля не выводятся.',
            'Shown first on the Legal page (/legal#details). Empty fields are left out.',
            '显示在“法律信息”页面最前面（/legal#details）。空字段不显示。',
          ),
          fields: [
            { name: 'company', type: 'text', localized: true, label: tr('Полное название (ООО или ИП…)', 'Full legal name', '公司全称') },
            {
              type: 'row',
              fields: [
                { name: 'inn', type: 'text', label: tr('ИНН', 'INN (tax number)', 'INN（税号）') },
                { name: 'kpp', type: 'text', label: tr('КПП', 'KPP', 'KPP') },
                { name: 'ogrn', type: 'text', label: tr('ОГРН / ОГРНИП', 'OGRN (registration number)', 'OGRN（注册号）') },
              ],
            },
            { name: 'legalAddress', type: 'textarea', localized: true, label: tr('Юридический адрес', 'Registered address', '注册地址') },
            { name: 'bank', type: 'textarea', localized: true, label: tr('Банковские реквизиты', 'Bank details', '银行信息') },
          ],
        },
      ],
    },
  ],
}
