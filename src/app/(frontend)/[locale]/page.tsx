import { cookies } from 'next/headers'

import { HomeSliders } from '@/components/home/HomeSliders'
import { PromoVideo } from '@/components/promo/PromoVideo'
import { getHomeSlides } from '@/lib/homeSlides'
import { INTRO_COOKIE } from '@/lib/site'
import { getPromoVideo } from '@/lib/studio'

/**
 * Page 1 · Home: two opposing sliders and the floating logo; on the first visit the promo video plays over them.
 * The video plays once per browser session (every new visit); /?intro plays it again (to check it or to show it to someone).
 */
export const dynamic = 'force-dynamic'

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ left, right }, jar, query] = await Promise.all([getHomeSlides(), cookies(), searchParams])
  const intro = jar.has(INTRO_COOKIE) && !('intro' in query) ? null : await getPromoVideo()
  return (
    <>
      {/* First in the page so keyboard and screen reader users meet it before the sliders behind it */}
      {intro && <PromoVideo {...intro} intro />}
      <HomeSliders left={left} right={right} />
    </>
  )
}
