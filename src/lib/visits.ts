/**
 * Pages seen in this tab since the site loaded, counted by the page frame on every client-side navigation.
 * «Вернуться» (12.2, 15.2) goes back only when there is a page of this site to go back to.
 */
let seen = 0
let last = ''

/** Effects can run twice for one page (React strict mode in development), so a repeat of the same page is not counted */
export function noteVisit(path: string) {
  if (path !== last) seen += 1
  last = path
}

export const cameFromSite = () =>
  seen > 1 || (!!document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1)
