import { describe, expect, it } from 'vitest'

import { bounds, coverRect, cropFormats, focusAt, focusOf, formatsFor, intersect, isUpright, objectPosition } from '@/lib/crops'

const landscape = { width: 3000, height: 2000 } // 3:2
const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 6)

describe('focal point', () => {
  it('defaults to the centre and clamps to the photo', () => {
    expect(focusOf(null)).toEqual({ x: 50, y: 50 })
    expect(focusOf(7)).toEqual({ x: 50, y: 50 })
    expect(focusOf({ focalX: null, focalY: 30 })).toEqual({ x: 50, y: 30 })
    expect(focusOf({ focalX: -10, focalY: 140 })).toEqual({ x: 0, y: 100 })
  })

  it('leaves untouched photos without an object-position', () => {
    expect(objectPosition({ focalX: 50, focalY: 50 })).toBeUndefined()
    expect(objectPosition({})).toBeUndefined()
    expect(objectPosition(12)).toBeUndefined()
    expect(objectPosition({ focalX: 20, focalY: 75 })).toBe('20% 75%')
  })

  it('rounds a picked spot the way Payload stores it', () => {
    expect(focusAt(0.234, 0.5)).toEqual({ x: 23, y: 50 })
    expect(focusAt(-1, 2)).toEqual({ x: 0, y: 100 })
  })
})

describe('cover crop', () => {
  it('keeps the full height in a box narrower than the photo and moves with the focal point', () => {
    // A square box on a 3:2 photo shows 2/3 of its width
    const centre = coverRect(landscape, { aspect: 1 }, { x: 50, y: 50 })
    close(centre.w, 2 / 3)
    close(centre.h, 1)
    close(centre.x, 1 / 6)
    const left = coverRect(landscape, { aspect: 1 }, { x: 0, y: 50 })
    close(left.x, 0)
    const right = coverRect(landscape, { aspect: 1 }, { x: 100, y: 50 })
    close(right.x + right.w, 1)
  })

  it('keeps the full width in a box wider than the photo', () => {
    const r = coverRect(landscape, { aspect: 3 }, { x: 50, y: 0 })
    close(r.w, 1)
    close(r.h, 0.5)
    close(r.y, 0)
  })

  it('always keeps the focal point on screen, as object-position does', () => {
    for (const f of cropFormats.filter((f) => !f.window)) {
      for (const focus of [{ x: 0, y: 0 }, { x: 37, y: 81 }, { x: 100, y: 100 }]) {
        const r = coverRect(landscape, f, focus)
        expect(focus.x / 100).toBeGreaterThanOrEqual(r.x - 1e-9)
        expect(focus.x / 100).toBeLessThanOrEqual(r.x + r.w + 1e-9)
        expect(focus.y / 100).toBeGreaterThanOrEqual(r.y - 1e-9)
        expect(focus.y / 100).toBeLessThanOrEqual(r.y + r.h + 1e-9)
      }
    }
  })

  it('shows the middle of the slide in a Home half', () => {
    // A 16:9 slide on a 16:9 photo shows all of it; the half shows the middle half
    const r = coverRect({ width: 1920, height: 1080 }, { aspect: 1920 / 1080, window: 0.5 }, { x: 50, y: 50 })
    close(r.x, 0.25)
    close(r.w, 0.5)
    close(r.h, 1)
  })
})

describe('fixed and adaptive areas', () => {
  it('finds the part every box shows and the outline of all of them', () => {
    const rects = [coverRect(landscape, { aspect: 1 }, { x: 50, y: 50 }), coverRect(landscape, { aspect: 3 }, { x: 50, y: 50 })]
    const fixed = intersect(rects)!
    close(fixed.w, 2 / 3)
    close(fixed.h, 0.5)
    const all = bounds(rects)!
    close(all.w, 1)
    close(all.h, 1)
  })

  it('reports no fixed area when the boxes do not meet', () => {
    expect(intersect([{ x: 0, y: 0, w: 0.3, h: 1 }, { x: 0.5, y: 0, w: 0.3, h: 1 }])).toBeNull()
    expect(intersect([])).toBeNull()
    expect(bounds([])).toBeNull()
  })

  it('offers the tall card to upright photos only', () => {
    expect(isUpright({ width: 1000, height: 1500 })).toBe(true)
    expect(isUpright({ width: 1000, height: 1000 })).toBe(false)
    expect(formatsFor(landscape, ['cards']).some((f) => f.id === 'cardTall')).toBe(false)
    expect(formatsFor({ width: 1000, height: 1500 }, ['cards']).some((f) => f.id === 'cardTall')).toBe(true)
    expect(formatsFor(landscape, []).length).toBe(0)
  })

  it('names every format once', () => {
    const ids = cropFormats.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
