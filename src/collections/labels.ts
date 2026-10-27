import type { Locale } from '../i18n/locales'

/**
 * An admin text in each interface language (an editor picks theirs in the admin header or their account).
 * Field labels, tabs, hints and options use it, so switching the admin to English or Chinese changes them too.
 */
export const tr = (ru: string, en: string, zh: string): Record<Locale, string> => ({ ru, en, zh })

/** Admin side menu groups: what the studio edits for each page, then service items. */
export const groups = {
  projects: tr('Проекты и команда', 'Projects and team', '项目与团队'),
  pages: tr('Страницы сайта', 'Site pages', '网站页面'),
  service: tr('Заявки, файлы, доступ', 'Enquiries, files, access', '咨询、文件、权限'),
}
