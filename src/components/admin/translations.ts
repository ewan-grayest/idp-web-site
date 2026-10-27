/** Labels for the studio's own admin controls, per admin language. */
export const adminTranslations = {
  en: {
    hotspotsHelp: 'Click the photo to add a product there; drag a number to move it. Then pick its partner and name in the numbered row below.',
    hotspotsNoPhoto: 'Choose the photo first: then products can be placed on it.',
    hotspotsMove: 'Product (drag or use the arrow keys to move)',
    hotspotsUnplaced: 'Some products below have no position yet: they are not on the photo and the site does not show them.',
    viewSite: 'View site',
    interfaceLanguage: 'Interface language',
    interface: 'Interface',
    guideTitle: 'Languages in the admin',
    guideInterface: 'Interface: the RU / EN / 中 buttons at the top right change the menus, buttons and field names. Each person’s choice is kept in their browser.',
    guideContent:
      'Content language: the switch beside them picks which language’s texts you are editing. Fill in Russian first; an English or Chinese text left empty shows in Russian on the site.',
  },
  ru: {
    hotspotsHelp: 'Нажмите на фото, чтобы поставить товар; перетащите номер, чтобы сдвинуть. Партнёра и название выберите в строке с тем же номером ниже.',
    hotspotsNoPhoto: 'Сначала выберите фото — потом на нём можно расставить товары.',
    hotspotsMove: 'Товар (перетащите или двигайте стрелками)',
    hotspotsUnplaced: 'У некоторых товаров ниже нет места на фото: на сайте они не показываются.',
    viewSite: 'Открыть сайт',
    interfaceLanguage: 'Язык интерфейса',
    interface: 'Интерфейс',
    guideTitle: 'Языки в админке',
    guideInterface: 'Интерфейс: кнопки RU / EN / 中 вверху справа меняют язык меню, кнопок и названий полей. Выбор запоминается в браузере каждого сотрудника.',
    guideContent:
      'Язык контента: переключатель рядом с ними выбирает, на каком языке вы правите тексты. Сначала заполните русский; пустой английский или китайский текст на сайте показывается по‑русски.',
  },
  zh: {
    hotspotsHelp: '点击照片即可在该处添加商品；拖动编号可移动位置。然后在下方同编号的行中选择合作伙伴并填写名称。',
    hotspotsNoPhoto: '请先选择照片，然后即可在照片上放置商品。',
    hotspotsMove: '商品（拖动或使用方向键移动）',
    hotspotsUnplaced: '下方部分商品尚未放置在照片上，网站不会显示它们。',
    viewSite: '查看网站',
    interfaceLanguage: '界面语言',
    interface: '界面',
    guideTitle: '后台语言',
    guideInterface: '界面：右上角的 RU / EN / 中 按钮切换菜单、按钮和字段名称的语言。每个人的选择保存在自己的浏览器中。',
    guideContent: '内容语言：旁边的切换器选择正在编辑哪种语言的文本。请先填写俄语；英文或中文留空时，网站显示俄语。',
  },
} as const

export type AdminKey = keyof (typeof adminTranslations)['en']
