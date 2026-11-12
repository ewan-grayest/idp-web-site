import type { Media } from '@/payload-types'

/** One <source> of the promo video (page 2). */
export type VideoSource = { src: string; type?: string }

/**
 * The address that shows the video's first frame before it plays, the background when no image is chosen
 * (Studio → Promo video, Ewan, 2026-11-12). Most browsers draw the first frame once the start of the file has loaded,
 * but Safari on iPhone and iPad draws nothing until playback unless the address names a start time, hence `#t=0.001`.
 * An address that already has a fragment keeps it.
 */
export const firstFrameSrc = (src: string) => (src.includes('#') ? src : `${src}#t=0.001`)

/**
 * The background image shown until the promo video starts. A GIF stays the uploaded file, so it moves as it was made;
 * other images come at the 1920px size made on upload, or as uploaded when they are smaller than that.
 */
export function promoBackgroundUrl(image: Media | number | null | undefined) {
  if (!image || typeof image !== 'object' || !image.url) return undefined
  if (!image.mimeType?.startsWith('image/')) return undefined
  if (image.mimeType === 'image/gif') return image.url
  return image.sizes?.wide?.url || image.url
}
