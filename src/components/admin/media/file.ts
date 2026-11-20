/* A «Фото и видео» document as the admin's list and form hand it over, with the bits our controls need. */

export type MediaDoc = {
  id: number | string
  filename?: string | null
  alt?: string | null
  url?: string | null
  mimeType?: string | null
  width?: number | null
  height?: number | null
  filesize?: number | null
  focalX?: number | null
  focalY?: number | null
  updatedAt?: string | null
  sizes?: Partial<Record<'thumb' | 'wide' | 'panorama', { url?: string | null } | null>> | null
}

export const isImage = (d: Pick<MediaDoc, 'mimeType'>) => !!d.mimeType?.startsWith('image/')
export const isVideo = (d: Pick<MediaDoc, 'mimeType'>) => !!d.mimeType?.startsWith('video/')

/** The file's address with its last change, so a browser never shows an older copy after a new upload. */
export function fresh(url: string | null | undefined, d: Pick<MediaDoc, 'updatedAt'>): string | undefined {
  if (!url) return undefined
  return d.updatedAt ? `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(d.updatedAt)}` : url
}

/** A small copy for thumbnails: Payload's 640px `thumb`, or the file itself (SVG, GIF, files older than the sizes). */
export const thumbOf = (d: MediaDoc) => fresh(d.sizes?.thumb?.url || d.url, d)

/** Width over height, when the file has them. */
export const ratioOf = (d: Pick<MediaDoc, 'width' | 'height'>) => (d.width && d.height ? d.width / d.height : undefined)
