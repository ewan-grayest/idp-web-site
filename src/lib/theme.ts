/**
 * Dark/light switch (design tokens v1.0). Without a saved choice the site follows the system setting;
 * a click saves the visitor's choice in localStorage and sets <html data-theme>.
 */
export type Theme = 'light' | 'dark'

export const THEME_KEY = 'idp-theme'

/** Runs inline in <head> before first paint, so a saved theme never flashes. */
export const themeScript = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`

export function currentTheme(): Theme {
  const set = document.documentElement.dataset.theme
  if (set === 'light' || set === 'dark') return set
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Fired on window after a switch, so every theme button (header, menu) shows the new state. */
export const THEME_EVENT = 'idp:theme'

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  window.dispatchEvent(new Event(THEME_EVENT))
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* private mode: the choice lasts for this page only */
  }
}
