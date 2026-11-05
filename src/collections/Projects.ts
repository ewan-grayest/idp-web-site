import type { CollectionConfig, Field } from 'payload'

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
    label: tr('Товары на фото (5.1.3)', 'Products in the photo (5.1.3)', '照片中的商品 (5.1.3)'),
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
 * Projects: residential (pages 5/7), public (8/9), archive (16/17).
 * All three detail pages share one template.
 */
export const Projects: CollectionConfig = {
  slug: 'projects',
  labels: { singular: { ru: 'Проект', en: 'Project', zh: '项目' }, plural: { ru: 'Проекты', en: 'Projects', zh: '项目' } },
  admin: { group: groups.projects, useAsTitle: 'title', defaultColumns: ['title', 'kind', 'onHome', 'homeOrder', 'homeShowName', 'updatedAt'], preview: previewProject },
  access: { read: () => true },
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
                { label: tr('Архивный', 'Archive', '归档'), value: 'archive' },
              ],
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
              label: tr('Показывать в слайдере на главной (1.2 / 1.3)', 'Show in the Home slider (1.2 / 1.3)', '在首页轮播中显示 (1.2 / 1.3)'),
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
            {
              name: 'homeShowName',
              type: 'checkbox',
              defaultValue: true,
              label: tr('Показывать название на слайде главной', 'Show the name on the Home slide', '在首页幻灯片上显示名称'),
              admin: {
                description: tr(
                  'Снимите галочку, чтобы на слайде остались только фото и «Смотреть проект». Само название нужно и дальше: оно есть на странице проекта и в списках.',
                  'Untick to leave only the photo and «Смотреть проект» (view project) on the slide. The title itself is still needed: the project page and lists use it.',
                  '取消勾选后，幻灯片上只保留照片和“Смотреть проект”（查看项目）。名称本身仍需填写：项目页面和列表会用到它。',
                ),
              },
            },
            { name: 'tags', type: 'relationship', relationTo: 'tags', hasMany: true, label: tr('Теги (5.3.1)', 'Tags (5.3.1)', '标签 (5.3.1)') },
          ],
        },
        {
          label: tr('Презентация', 'Presentation', '展示'),
          fields: [
            {
              name: 'gallery',
              type: 'array',
              label: tr('Кадры (5.1.1): сколько угодно; на экране видно 7', 'Frames (5.1.1): any number; 7 are visible at once', '画面 (5.1.1)，数量不限；一屏显示 7 张'),
              labels: { singular: tr('Кадр', 'Frame', '画面'), plural: tr('Кадры', 'Frames', '画面') },
              fields: photoFields,
            },
          ],
        },
        {
          label: tr('Автор', 'Author', '作者'),
          fields: [
            { name: 'leadAuthor', type: 'relationship', relationTo: 'people', label: tr('Автор (5.2.1 и 5.2.3)', 'Author (5.2.1 and 5.2.3)', '作者 (5.2.1、5.2.3)') },
            // No default role: an empty one shows "Ведущий архитектор" in the page's language
            { name: 'leadRole', type: 'text', localized: true, label: tr('Роль (5.2.2): если не «Ведущий архитектор»', 'Role (5.2.2): if not «Ведущий архитектор» (lead architect)', '角色 (5.2.2)，如果不是“首席建筑师”') },
            { name: 'summary', type: 'textarea', localized: true, label: tr('О проекте (5.2.5)', 'About the project (5.2.5)', '项目简介 (5.2.5)') },
            { name: 'quote', type: 'textarea', localized: true, label: tr('Цитата автора (5.2.4)', 'Author\'s quote (5.2.4)', '作者语录 (5.2.4)') },
            { name: 'authors', type: 'relationship', relationTo: 'people', hasMany: true, label: tr('Команда проекта (5.3.2)', 'Project team (5.3.2)', '项目团队 (5.3.2)') },
          ],
        },
        {
          label: tr('Этапы', 'Stages', '阶段'),
          fields: [
            stage('concept', tr('Концепт (5.4)', 'Concept (5.4)', '概念 (5.4)')),
            stage('preview', tr('Превью (5.5)', 'Preview (5.5)', '预览 (5.5)')),
            stage('process', tr('Процесс (5.6)', 'Process (5.6)', '过程 (5.6)')),
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
              label: tr('Следующий этап этого проекта (5.11.2 «Скоро»)', 'Next stage of this project (5.11.2 «Скоро»: coming soon)', '本项目的下一阶段（5.11.2“即将推出”）'),
            },
          ],
        },
      ],
    },
    {
      name: 'shortCode',
      type: 'text',
      unique: true,
      index: true,
      label: tr('Короткая ссылка (5.7.4)', 'Short link (5.7.4)', '短链接 (5.7.4)'),
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}
