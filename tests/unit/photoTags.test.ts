import { describe, expect, it } from 'vitest'

import { filterTags, imageLd, jsonLdText, photoRowsOf, photoTags, shownPhotoTags, shownTagIds } from '@/lib/photoTags'
import type { Media, Project, Tag } from '@/payload-types'

const tag = (id: number, slug: string, title = slug): Tag => ({ id, slug, title, createdAt: '', updatedAt: '' })
const loft = tag(1, 'loft', 'Лофт')
const wood = tag(2, 'wood', 'Дерево')
const light = tag(3, 'light', 'Свет')
const media = (id: number, tags: (number | Tag)[], showTags: boolean): Media => ({ id, tags, showTags, createdAt: '', updatedAt: '' })

const project = (p: Partial<Project>): Project => ({ id: 1, title: 'P', slug: 'p', kind: 'residential', createdAt: '', updatedAt: '', ...p }) as Project

describe('photo tags', () => {
  it('reads the loaded tags; a visitor sees them only when the file says so', () => {
    expect(photoTags(media(1, [loft, 7, wood], false))).toEqual([loft, wood])
    expect(shownPhotoTags(media(1, [loft], false))).toEqual([])
    expect(shownPhotoTags(media(1, [loft], true))).toEqual([loft])
    expect(photoTags(5)).toEqual([])
    expect(shownPhotoTags(null)).toEqual([])
  })

  it('collects every photo of a project: strip and stages', () => {
    const p = project({
      gallery: [{ image: media(1, [], false) }],
      concept: { photos: [{ image: media(2, [], false) }] },
      process: { photos: [{ image: 3 }] },
    } as Partial<Project>)
    expect(photoRowsOf(p).length).toBe(3)
  })

  it('lets the list filter find a project by the tags its photos show, loaded or not', () => {
    const p = project({
      tags: [loft],
      gallery: [{ image: media(1, [2, loft], true) }, { image: media(2, [light], false) }],
    } as Partial<Project>)
    expect(shownTagIds(p)).toEqual([2, 1])
    const byId = new Map([loft, wood, light].map((t) => [t.id, t]))
    // Its own tag first, then the shown photo tag; the hidden one stays out, nothing twice
    expect(filterTags(p, byId).map((t) => t.slug)).toEqual(['loft', 'wood'])
  })
})

describe('structured data', () => {
  it('describes a photo with absolute address, size and keywords', () => {
    expect(imageLd({ url: '/api/v1/media/file/a.jpg', alt: 'Гостиная', width: 3000, height: 2000, keywords: ['Лофт', ' Дерево ', 'Лофт', ''] }, 'https://idp.example')).toEqual({
      '@type': 'ImageObject',
      contentUrl: 'https://idp.example/api/v1/media/file/a.jpg',
      caption: 'Гостиная',
      width: 3000,
      height: 2000,
      keywords: 'Лофт, Дерево',
    })
    expect(imageLd({ url: 'https://cdn.example/a.jpg' }, 'https://idp.example')).toEqual({ '@type': 'ImageObject', contentUrl: 'https://cdn.example/a.jpg' })
  })

  it('cannot be closed by text from the admin', () => {
    const text = jsonLdText({ name: '</script><script>alert(1)</script>' })
    expect(text).not.toContain('</script>')
    expect(JSON.parse(text)).toEqual({ name: '</script><script>alert(1)</script>' })
  })
})
