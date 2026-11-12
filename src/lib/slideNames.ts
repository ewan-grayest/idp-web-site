/**
 * Names on the Home slides 1.2 / 1.3 (Ewan, 2026-11-12). Each project has «Показывать название на слайде главной»;
 * «Настройки сайта и интеграции» → «Главная» either leaves it to each project or overrides every project at once.
 */
export const slideNameModes = ['project', 'show', 'hide'] as const
export type SlideNameMode = (typeof slideNameModes)[number]

/** Whether a slide leaves its project's name off. Unset values count as the defaults: per project, name shown. */
export function slideNameHidden(mode: SlideNameMode | null | undefined, projectShowsName: boolean | null | undefined): boolean {
  if (mode === 'show') return false
  if (mode === 'hide') return true
  return projectShowsName === false
}
