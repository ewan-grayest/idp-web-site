import { describe, expect, it } from 'vitest'

import { firstFrameSrc, promoBackgroundUrl } from '@/lib/promo'
import type { Media } from '@/payload-types'

const media = (m: Partial<Media>) => ({ id: 1, createdAt: '', updatedAt: '', ...m }) as Media

describe('promo video first frame', () => {
  it('asks for a start time, so Safari on iPhone draws the first frame before playback', () => {
    expect(firstFrameSrc('/api/v1/media/file/film.mp4')).toBe('/api/v1/media/file/film.mp4#t=0.001')
    expect(firstFrameSrc('https://cdn.example/film.mp4?v=2')).toBe('https://cdn.example/film.mp4?v=2#t=0.001')
  })
  it('leaves an address that already has a fragment alone', () => {
    expect(firstFrameSrc('/film.mp4#t=5')).toBe('/film.mp4#t=5')
  })
})

describe('promo background image', () => {
  it('keeps a GIF as uploaded, so it moves as it was made', () => {
    const gif = media({ url: '/file/loop.gif', mimeType: 'image/gif', sizes: { wide: { url: '/file/loop-1920x1080.gif' } } })
    expect(promoBackgroundUrl(gif)).toBe('/file/loop.gif')
  })
  it('takes the 1920px size of a still image, or the upload when it is smaller', () => {
    expect(promoBackgroundUrl(media({ url: '/file/big.jpg', mimeType: 'image/jpeg', sizes: { wide: { url: '/file/big-1920x1080.jpg' } } }))).toBe(
      '/file/big-1920x1080.jpg',
    )
    expect(promoBackgroundUrl(media({ url: '/file/small.png', mimeType: 'image/png', sizes: { wide: { url: null } } }))).toBe('/file/small.png')
  })
  it('gives nothing for no image, an unpopulated id or a video', () => {
    expect(promoBackgroundUrl(null)).toBeUndefined()
    expect(promoBackgroundUrl(7)).toBeUndefined()
    expect(promoBackgroundUrl(media({ url: '/file/film.mp4', mimeType: 'video/mp4' }))).toBeUndefined()
  })
})
