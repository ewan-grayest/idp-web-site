import type { Metadata } from 'next'

import { PromoVideo } from '@/components/promo/PromoVideo'
import { getT } from '@/i18n/server'
import { getPromoVideo } from '@/lib/studio'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).pages[2] }
}

/**
 * Page 2 · Promo: full-screen studio video (the upload in Студия → Промо-видео). Home also plays it on the first visit.
 * Its end, Close or a click on it go Home.
 */
export default async function PromoPage() {
  const { sources, placeholder, autoplay, sound, background } = await getPromoVideo()
  return <PromoVideo sources={sources} placeholder={placeholder} autoplay={autoplay} sound={sound} background={background} />
}
