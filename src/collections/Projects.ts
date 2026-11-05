import type { CollectionConfig, Field } from 'payload'

import { publishedOnly } from '../lib/published'
import { makeShortCode } from '../lib/shortCode'
import { requiredInRussian } from './localized'
import { groups, tr } from './labels'
import { previewProject } from './preview'

/** One photo, optionally with shopping hotspots (5.1.3) that lead to a GT partner. */
const photoFields: Field[] = [
  { name: 'image', type: 'upload', relationTo: 'media', required: true, label: tr('Фото', 'Photo', '照片') },
  // Visual placement of the products below: click the photo to add one, drag to move (Ewan, 2026-10-26)
  { name: 'hotspotPicker', type: 'ui', admin: { components: { Field: '/components/admin/HotspotPicker#HotspotPicker' } } },
  {
    name: 'hotspots',
    type: 'array',
    label: tr('Товары на фото', 'Products in the photo', '照片中的商品'),
    labels: { singular: tr('Товар', 'Product', '商品'), plural: tr('Товары', 'Products', '商品') },
    // Nothing here is required, so a half-filled product never blocks saving the project;
    // the site shows a product once it has a partner and both coordinates
    admin: {
      initCollapsed: true,
      description: tr(
        'Товар появляется на фото, когда выбраны партнёр и обе координаты. Незаполненный товар не мешает сохранению.',
        'A product shows on the photo once it has a partner and both coordinates. An unfinished one does not block saving.',
        '选择合作伙伴并填写两个坐标后，商品才会显示在照片上。未填完的商品不影响保存。',
      ),
    },
    fields: [
      { name: 'label', type: 'text', localized: true, label: tr('Что это (диван или светильник…)', 'What it is (sofa or lamp…)', '这是什么（沙发、灯具…）') },
      { name: 'partner', type: 'relationship', relationTo: 'partners', label: tr('Партнёр', 'Partner', '合作伙伴') },
      { name: 'x', type: 'number', min: 0, max: 100, label: tr('X: % от левого края', 'X: % from the left edge', 'X，距左边缘 %') },
      { name: 'y', type: 'number', min: 0, max: 100, label: tr('Y: % от верха', 'Y: % from the top', 'Y，距顶部 %') },
    ],
  },
]

/** Concept 5.4, Preview 5.5, Process 5.6: a sideways gallery plus a text. */
const stage = (name: string, label: Record<string, string>): Field => ({
  name,
  type: 'group',
  label,
  fields: [
    {
      name: 'photos',
      type: 'array',
      label: tr('Фото', 'Photos', '照片'),
      labels: { singular: tr('Фото', 'Photo', '照片'), plural: tr('Фото', 'Photos', '照片') },
      fields: photoFields,
    },
    { name: 'text', type: 'textarea', localized: true, label: tr('Текст', 'Text', '文字') },
  ],
})

/**
 * Projects: residential (pages 5/7), public (8/9), product design (16/17, the ID Lab page; it replaced archive,
 * Ewan, 2026-11-05). All three detail pages share one template.
 * «Публиковать на сайте» off: only signed-in staff read the project, in /admin and in its preview (Ewan, 2026-11-05).
 */
export const Projects: CollectionConfig = {
  slug: 'projects',
  labels: { singular: { ru: 'Проект', en: 'Project', zh: '项目' }, plural: { ru: 'Проекты', en: 'Projects', zh: '项目' } },
  admin: { group: groups.projects, useAsTitle: 'title', defaultColumns: ['title', 'kind', 'publishOnSite', 'onHome', 'homeOrder', 'updatedAt'], preview: previewProject },
  access: { read: ({ req }) => Boolean(req.user) || publishedOnly },
  hooks: {
    beforeChange: [
      ({ data }) => {
        // 5.7.4 short link, made once and never changed so shared links keep working
        if (!data.shortCode) data.shortCode = makeShortCode()
        return data
      },
    ],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: tr('Основное', 'Main', '基本信息'),
          fields: [
            { name: 'title', type: 'text', ...requiredInRussian, label: tr('Название', 'Title', '名称') },
            { name: 'slug', type: 'text', required: true, unique: true, index: true, label: tr('Адрес (slug)', 'Address (slug)', '网址 (slug)') },
            {
              name: 'kind',
              type: 'select',
              required: true,
              label: tr('Тип', 'Type', '类型'),
              options: [
                { label: tr('Жилой', 'Residential', '住宅'), value: 'residential' },
                { label: tr('Общественный', 'Public', '公共空间'), value: 'public' },
                { label: tr('Предметный дизайн (ID Lab)', 'Product design (ID Lab)', '产品设计 (ID Lab)'), value: 'product' },
              ],
              admin: {
                description: tr(
                  'Предметный дизайн показывается на странице ID Lab (/id-lab), а не в разделе «Проекты».',
                  'Product design shows on the ID Lab page (/id-lab), not under «Проекты» (projects).',
                  '产品设计显示在 ID Lab 页面 (/id-lab)，不在“项目”栏目中。',
                ),
              },
            },
            {
              name: 'cover',
              type: 'upload',
              relationTo: 'media',
              label: tr('Панорама (обложка и главная)', 'Panorama (cover and Home)', '全景图（封面、首页）'),
              admin: {
                description: tr(
                  'Широкое фото: это слайд проекта на главной. Без него на слайде будет рисунок-заглушка.',
                  'A wide photo: the project\'s slide on Home. Without it the slide shows a placeholder drawing.',
                  '宽幅照片：项目在首页的幻灯片。没有时显示占位图。',
                ),
              },
            },
            {
              name: 'onHome',
              type: 'checkbox',
              defaultValue: false,
              label: tr('Показывать в слайдере на главной', 'Show in the Home slider', '在首页轮播中显示'),
              admin: {
                description: tr(
                  'Проект станет слайдом на главной: общественные слева, жилые справа. Клик по слайду открывает проект.',
                  'The project becomes a slide on Home: public on the left, residential on the right. Clicking the slide opens the project.',
                  '项目将成为首页幻灯片：公共空间在左，住宅在右。点击幻灯片打开项目。',
                ),
              },
            },
            {
              name: 'homeOrder',
              type: 'number',
              label: tr('Порядок на главной', 'Order on Home', '首页顺序'),
              admin: {
                description: tr(
                  'Меньше число — раньше в слайдере; без числа — в конце.',
                  'Lower numbers come first in the slider; no number means last.',
                  '数字越小越靠前；不填则排在最后。',
                ),
              },
            },
            { name: 'tags', type: 'relationship', relationTo: 'tags', hasMany: true, label: tr('Теги', 'Tags', '标签') },
          ],
        },
        {
          label: tr('Презентация', 'Presentation', '展示'),
          fields: [
            {
              name: 'gallery',
              type: 'array',
              label: tr('Кадры: сколько угодно; на экране видно 7', 'Frames: any number; 7 are visible at once', '画面：数量不限；一屏显示 7 张'),
              labels: { singular: tr('Кадр', 'Frame', '画面'), plural: tr('Кадры', 'Frames', '画面') },
              fields: photoFields,
            },
          ],
        },
        {
          label: tr('Автор', 'Author', '作者'),
          fields: [
            { name: 'leadAuthor', type: 'relationship', relationTo: 'people', label: tr('Автор', 'Author', '作者') },
            // No default role: an empty one shows "Ведущий архитектор" in the page's language
            { name: 'leadRole', type: 'text', localized: true, label: tr('Роль: если не «Ведущий архитектор»', 'Role: if not «Ведущий архитектор» (lead architect)', '角色：如果不是“首席建筑师”') },
            { name: 'summary', type: 'textarea', localized: true, label: tr('О проекте', 'About the project', '项目简介') },
            { name: 'quote', type: 'textarea', localized: true, label: tr('Цитата автора', 'Author\'s quote', '作者语录') },
            { name: 'authors', type: 'relationship', relationTo: 'people', hasMany: true, label: tr('Команда проекта', 'Project team', '项目团队') },
          ],
        },
        {
          label: tr('Этапы', 'Stages', '阶段'),
          fields: [
            stage('concept', tr('Концепт', 'Concept', '概念')),
            stage('preview', tr('Превью', 'Preview', '预览')),
            stage('process', tr('Процесс', 'Process', '过程')),
          ],
        },
        {
          label: tr('Достижения', 'Achievements', '成就'),
          fields: [
            {
              name: 'achievements',
              type: 'array',
              label: tr('События (новые показываются слева)', 'Events (newest shown on the left)', '事件（最新的显示在左）'),
              labels: { singular: tr('Событие', 'Event', '事件'), plural: tr('События', 'Events', '事件') },
              fields: [
                { name: 'date', type: 'date', required: true, label: tr('Дата', 'Date', '日期') },
                { name: 'title', type: 'text', ...requiredInRussian, label: tr('Событие', 'Event', '事件') },
                { name: 'text', type: 'textarea', localized: true, label: tr('Текст', 'Text', '文字') },
                { name: 'image', type: 'upload', relationTo: 'media', label: tr('Изображение', 'Image', '图片') },
                { name: 'link', type: 'text', label: tr('Ссылка «Подробнее»', '«Подробнее» (more) link', '“详情”链接') },
              ],
            },
          ],
        },
        {
          label: tr('Связи', 'Links', '关联'),
          fields: [
            {
              name: 'nextStage',
              type: 'relationship',
              relationTo: 'projects',
              label: tr('Следующий этап этого проекта («Скоро»)', 'Next stage of this project («Скоро»: coming soon)', '本项目的下一阶段（“即将推出”）'),
            },
          ],
        },
      ],
    },
    {
      name: 'publishOnSite',
      type: 'checkbox',
      defaultValue: true,
      label: tr('Публиковать на сайте', 'Publish on site', '在网站上发布'),
      admin: {
        position: 'sidebar',
        description: tr(
          'Снимите галочку, и проект останется только в админке: на сайте его нет ни в списках, ни на главной, ни в поиске, ни в ссылках, а его адрес ведёт на «Страница не найдена». «Предпросмотр» показывает его вошедшим сотрудникам.',
          'Untick to keep the project in the admin only: the site leaves it out of lists, Home, search and links, and its address shows «Страница не найдена» (page not found). «Предпросмотр» (preview) still shows it to signed-in staff.',
          '取消勾选后，项目只保留在后台：网站的列表、首页、搜索和链接中都不显示，其网址显示“Страница не найдена”（页面未找到）。已登录的员工仍可通过“Предпросмотр”（预览）查看。',
        ),
      },
    },
    {
      name: 'shortCode',
      type: 'text',
      unique: true,
      index: true,
      label: tr('Короткая ссылка', 'Short link', '短链接'),
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}
