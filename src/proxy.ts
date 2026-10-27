import { NextResponse, type NextRequest } from 'next/server'

import { defaultLocale, isLocale, PATH_HEADER } from './i18n/locales'

/**
 * Language routing. Pages live under app/(frontend)/[locale]:
 * - /en/studio, /zh/studio pass straight through;
 * - /studio is Russian: served from /ru/studio without changing the address;
 * - /ru/studio redirects to /studio, so each page has one Russian address.
 * Pages get the address without the prefix in a header, for the other-language links.
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

  headers.set(PATH_HEADER, pathname)
  url.pathname = `/${defaultLocale}${pathname === '/' ? '' : pathname}`
  return NextResponse.rewrite(url, { request: { headers } })
}

export const config = {
  // Not the admin, the API, Next.js files or anything with a file extension (robots.txt, images)
  matcher: ['/((?!admin|api|_next|.*\\.[\\w]+$).*)'],
}
