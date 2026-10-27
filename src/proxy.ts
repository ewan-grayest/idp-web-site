import { NextResponse, type NextRequest } from 'next/server'

import { browserLocale, CHOICE_COOKIE, defaultLocale, isLocale, PATH_HEADER } from './i18n/locales'

/**
 * Language routing. Pages live under app/(frontend)/[locale]:
 * - /en/studio, /zh/studio pass straight through;
 * - /studio is Russian: served from /ru/studio without changing the address;
 * - /ru/studio redirects to /studio, so each page has one Russian address.
 * Pages get the address without the prefix in a header, for the other-language links.
 * A first visit to a Russian address follows the browser's language (see browserLocale): /studio → /en/studio.
 * A language the visitor picked (CHOICE_COOKIE, set by the language links) wins over the browser.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const first = pathname.split('/')[1]
  const url = request.nextUrl.clone()

  if (first === defaultLocale) {
    url.pathname = pathname.slice(defaultLocale.length + 1) || '/'
    return NextResponse.redirect(url, 308)
  }

  const headers = new Headers(request.headers)
  if (isLocale(first)) {
    headers.set(PATH_HEADER, pathname.slice(first.length + 1) || '/')
    return NextResponse.next({ request: { headers } })
  }

  const chosen = request.cookies.get(CHOICE_COOKIE)?.value
  const wanted = isLocale(chosen) ? chosen : browserLocale(request.headers.get('accept-language'))
  if (wanted !== defaultLocale && request.method === 'GET') {
    url.pathname = `/${wanted}${pathname === '/' ? '' : pathname}`
    const res = NextResponse.redirect(url, 307)
    res.headers.set('Vary', 'Accept-Language, Cookie')
    return res
  }

  headers.set(PATH_HEADER, pathname)
  url.pathname = `/${defaultLocale}${pathname === '/' ? '' : pathname}`
  const res = NextResponse.rewrite(url, { request: { headers } })
  res.headers.set('Vary', 'Accept-Language, Cookie')
  return res
}

export const config = {
  // Not the admin, the API, Next.js files or anything with a file extension (robots.txt, images)
  matcher: ['/((?!admin|api|_next|.*\\.[\\w]+$).*)'],
}
