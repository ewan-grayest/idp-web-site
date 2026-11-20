'use client'
/* Texts of the studio's own controls for «Фото и видео»: the thumbnails switch, the full screen viewer and the
   cropping grid, per admin language. */
import { useTranslation } from '@payloadcms/ui'

import type { CropGroup } from '@/lib/crops'

type Texts = {
  thumbs: string
  thumbsSquare: string
  thumbsOriginal: string
  open: (name: string) => string
  close: string
  prev: string
  next: string
  screen: string
  screenExit: string
  edit: string
  gridHelp: string
  gridNoFile: string
  gridNotImage: string
  gridFocus: string
  gridCentre: string
  gridPoint: (x: number, y: number) => string
  gridGroups: string
  gridFixed: string
  gridAdaptive: string
  gridHidden: string
  gridNoFixed: string
  gridFormats: string
  gridShow: (name: string) => string
  groups: Record<CropGroup, string>
  formats: Record<string, string>
}

const texts: Record<'ru' | 'en' | 'zh', Texts> = {
  ru: {
    thumbs: 'Миниатюры',
    thumbsSquare: 'Квадратные',
    thumbsOriginal: 'По формату файла',
    open: (name) => `Открыть во весь экран: ${name}`,
    close: 'Закрыть',
    prev: 'Предыдущий файл',
    next: 'Следующий файл',
    screen: 'На весь монитор',
    screenExit: 'Выйти из полноэкранного режима',
    edit: 'Открыть карточку файла',
    gridHelp:
      'Перетащите точку на главное в кадре (или нажмите на фото): сайт обрезает фото вокруг неё. Рамка — часть, видная во всех отмеченных местах сайта; штриховка — видна только в части из них; затемнено — только в полноэкранном просмотре. Сохраните файл, чтобы сайт обрезал по‑новому.',
    gridNoFile: 'Сетка появится, когда файл будет сохранён.',
    gridNotImage: 'Кадрирование бывает только у изображений.',
    gridFocus: 'Фокус-точка: перетащите или двигайте стрелками',
    gridCentre: 'По центру',
    gridPoint: (x, y) => `Точка: ${x}% по ширине, ${y}% по высоте`,
    gridGroups: 'Где на сайте',
    gridFixed: 'Видно везде',
    gridAdaptive: 'Видно не везде',
    gridHidden: 'Только в полноэкранном просмотре',
    gridNoFixed: 'Нет части фото, видной во всех отмеченных местах: снимите лишние галочки или сдвиньте точку.',
    gridFormats: 'Как фото выглядит в каждом месте (нажмите, чтобы показать рамку на фото)',
    gridShow: (name) => `Показать рамку: ${name}`,
    groups: { home: 'Главная', project: 'Страница проекта', cards: 'Карточки', wide: 'Широкие кадры' },
    formats: {
      homeLaptop: 'Главная: половина экрана 16:10',
      homeWide: 'Главная: половина экрана 16:9',
      homeOpen: 'Главная: раскрытая половина',
      homeTablet: 'Главная: планшет вертикально',
      homePhone: 'Главная: телефон',
      strip: 'Лента проекта: 7 фото на экране',
      stripOpen: 'Лента проекта: фото под курсором',
      stripPhone: 'Лента проекта: телефон',
      stage: 'Концепция, превью, процесс',
      card: 'Карточка в списке проектов',
      cardTall: 'Вертикальная карточка',
      recommended: 'Рекомендации',
      square: 'Квадрат: телефон, ленты соцсетей',
      journal: 'Обложка выпуска журнала',
      banner: 'Автор и сотрудник: компьютер',
      bannerPhone: 'Автор и сотрудник: телефон',
      wide: 'Фото партнёра 16:9',
      press: 'Пресса 16:10',
      entries: 'Стиль жизни, работа с нами 3:2',
    },
  },
  en: {
    thumbs: 'Thumbnails',
    thumbsSquare: 'Square',
    thumbsOriginal: 'As the file',
    open: (name) => `Open full screen: ${name}`,
    close: 'Close',
    prev: 'Previous file',
    next: 'Next file',
    screen: 'Whole monitor',
    screenExit: 'Leave full screen',
    edit: 'Open the file’s page',
    gridHelp:
      'Drag the point onto what matters in the picture (or click the photo): the site crops the photo around it. The frame is the part every ticked place on the site shows; hatching, what only some of them show; shaded, only the full screen viewer. Save the file for the site to crop the new way.',
    gridNoFile: 'The grid appears once the file is saved.',
    gridNotImage: 'Only images are cropped.',
    gridFocus: 'Focal point: drag it or use the arrow keys',
    gridCentre: 'Centre',
    gridPoint: (x, y) => `Point: ${x}% across, ${y}% down`,
    gridGroups: 'Where on the site',
    gridFixed: 'Shown everywhere',
    gridAdaptive: 'Shown in some places',
    gridHidden: 'Only in the full screen viewer',
    gridNoFixed: 'No part of the photo shows in every ticked place: untick some or move the point.',
    gridFormats: 'How the photo looks in each place (click to draw its frame on the photo)',
    gridShow: (name) => `Draw the frame: ${name}`,
    groups: { home: 'Home', project: 'Project page', cards: 'Cards', wide: 'Wide frames' },
    formats: {
      homeLaptop: 'Home: half of a 16:10 screen',
      homeWide: 'Home: half of a 16:9 screen',
      homeOpen: 'Home: half opened out',
      homeTablet: 'Home: upright tablet',
      homePhone: 'Home: phone',
      strip: 'Project strip: 7 photos on screen',
      stripOpen: 'Project strip: photo under the pointer',
      stripPhone: 'Project strip: phone',
      stage: 'Concept, preview, process',
      card: 'Card in the project lists',
      cardTall: 'Upright card',
      recommended: 'Recommendations',
      square: 'Square: phone, social feeds',
      journal: 'Magazine issue cover',
      banner: 'Author and team member: computer',
      bannerPhone: 'Author and team member: phone',
      wide: 'Partner photo 16:9',
      press: 'Press 16:10',
      entries: 'Lifestyle, work with us 3:2',
    },
  },
  zh: {
    thumbs: '缩略图',
    thumbsSquare: '方形',
    thumbsOriginal: '按文件比例',
    open: (name) => `全屏打开：${name}`,
    close: '关闭',
    prev: '上一个文件',
    next: '下一个文件',
    screen: '整个显示器',
    screenExit: '退出全屏',
    edit: '打开文件页面',
    gridHelp:
      '把点拖到画面中最重要的位置（或点击照片）：网站会围绕它裁切照片。边框内是网站所有勾选位置都会显示的部分；斜线部分只在部分位置显示；变暗部分只在全屏查看器中显示。保存文件后网站按新方式裁切。',
    gridNoFile: '保存文件后显示网格。',
    gridNotImage: '只有图片可以裁切。',
    gridFocus: '焦点：拖动或使用方向键移动',
    gridCentre: '居中',
    gridPoint: (x, y) => `焦点：横向 ${x}%，纵向 ${y}%`,
    gridGroups: '网站上的位置',
    gridFixed: '处处可见',
    gridAdaptive: '部分位置可见',
    gridHidden: '仅在全屏查看器中',
    gridNoFixed: '没有在所有勾选位置都可见的部分：取消部分勾选或移动焦点。',
    gridFormats: '照片在各位置的样子（点击可在照片上显示其边框）',
    gridShow: (name) => `显示边框：${name}`,
    groups: { home: '首页', project: '项目页面', cards: '卡片', wide: '宽幅画面' },
    formats: {
      homeLaptop: '首页：16:10 屏幕的一半',
      homeWide: '首页：16:9 屏幕的一半',
      homeOpen: '首页：展开的一半',
      homeTablet: '首页：竖放平板',
      homePhone: '首页：手机',
      strip: '项目横条：屏幕上 7 张照片',
      stripOpen: '项目横条：指针下的照片',
      stripPhone: '项目横条：手机',
      stage: '概念、预览、过程',
      card: '项目列表中的卡片',
      cardTall: '竖版卡片',
      recommended: '推荐',
      square: '方形：手机、社交动态',
      journal: '杂志期刊封面',
      banner: '作者与团队成员：电脑',
      bannerPhone: '作者与团队成员：手机',
      wide: '合作伙伴照片 16:9',
      press: '媒体报道 16:10',
      entries: '生活方式、加入我们 3:2',
    },
  },
}

/** Texts in the current admin language; English for any other. */
export function useMediaTexts(): Texts {
  const { i18n } = useTranslation()
  return texts[i18n.language as keyof typeof texts] ?? texts.en
}

export { texts as mediaTexts }
