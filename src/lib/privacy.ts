/**
 * Visitor-side privacy helpers (152-ФЗ): links to the Legal page 14 documents and the cookie choice.
 * The server side (consent log) is src/lib/consentLog.ts.
 */

/** Legal page 14 documents, by slug (texts: scripts/legal-drafts.ts, edited in the admin). */
export const LEGAL_SLUGS = {
  consent: 'personal-data',
  policy: 'privacy',
  publication: 'publication-consent',
} as const

export const LEGAL_LINKS = {
  consent: `/legal#${LEGAL_SLUGS.consent}`,
  policy: `/legal#${LEGAL_SLUGS.policy}`,
  publication: `/legal#${LEGAL_SLUGS.publication}`,
} as const

/**
 * The visitor's cookie choice, a year long: 'all' lets third-party services (Yandex Maps, VK comments) load,
 * 'necessary' keeps to the site's own cookies and browser storage. No cookie: the notice is shown.
 */
export const COOKIE_CHOICE = 'idp-cookies'
export type CookieChoice = 'all' | 'necessary'
/** Fired on window when the choice changes, and to open the notice again (footer «Настройки cookie»). */
export const COOKIE_EVENT = 'idp:cookies'
export const COOKIE_SETTINGS_EVENT = 'idp:cookie-settings'

export function readCookieChoice(): CookieChoice | null {
  if (typeof document === 'undefined') return null
  const value = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE_CHOICE}=`))?.split('=')[1]
  return value === 'all' || value === 'necessary' ? value : null
}

export function saveCookieChoice(choice: CookieChoice) {
  document.cookie = `${COOKIE_CHOICE}=${choice}; path=/; max-age=31536000; samesite=lax`
  window.dispatchEvent(new CustomEvent<CookieChoice>(COOKIE_EVENT, { detail: choice }))
}

/** Writes the choice to «Журнал согласий»; the server adds the time, IP address, browser and document versions. */
export async function logCookieChoice(choice: CookieChoice, locale: string, fetchImpl: typeof fetch = fetch) {
  try {
    await fetchImpl('/api/v1/consents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purpose: 'cookies', decision: choice === 'all' ? 'agree' : 'necessary-only', originUrl: window.location.href, locale }),
    })
  } catch {
    /* offline: the choice still applies in this browser */
  }
}
