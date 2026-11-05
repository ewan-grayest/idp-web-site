import type { GlobalConfig } from 'payload'

import { groups, tr } from '../collections/labels'
import { previewHome } from '../collections/preview'

/**
 * Page 1 · Home: settings for the two project sliders 1.2 / 1.3. Which projects appear, and in what order, is set on
 * each project («Показывать в слайдере на главной»).
 */
export const Home: GlobalConfig = {
  slug: 'home',
  label: tr('Главная', 'Home', '首页'),
  admin: { group: groups.pages, preview: previewHome },
  access: { read: () => true },
  fields: [
    {
      // One switch for every slide; it replaced a tick on each project (Ewan, 2026-11-05)
      name: 'showSlideNames',
      type: 'checkbox',
      defaultValue: true,
      label: tr('Показывать название на слайде главной', 'Show the name on the Home slide', '在首页幻灯片上显示名称'),
      admin: {
        description: tr(
          'Действует на все слайды сразу. Выключено: на слайдах только фото и «Смотреть проект». Название по-прежнему есть на странице проекта и в списках, а программы чтения с экрана его называют.',
          'Applies to every slide at once. Off: slides show only the photo and «Смотреть проект» (view project). The name still appears on the project page and in lists, and screen readers still read it.',
          '对所有幻灯片同时生效。关闭后，幻灯片上只有照片和“Смотреть проект”（查看项目）。项目页面和列表中仍显示名称，读屏软件也仍会读出。',
        ),
      },
    },
  ],
}
