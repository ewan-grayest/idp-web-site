import { describe, expect, it } from 'vitest'
import { defaultLimits, resolveLimits, selectTags } from '@/lib/limits'

describe('spec limits at the server boundary', () => {
  it('uses the specified defaults for unsaved or invalid CMS settings', () => {
    expect(resolveLimits()).toEqual(defaultLimits)
    expect(resolveLimits({ maxTags: NaN, projectPosts: 0, latestReviews: -3 })).toEqual(defaultLimits)
  })
  it('accepts custom caps and bounds excessive or fractional settings', () => {
    expect(resolveLimits({ maxTags: 2, projectPosts: 4, latestReviews: 500, studioPosts: 9.8 })).toMatchObject({ maxTags: 2, projectPosts: 4, latestReviews: 100, studioPosts: 9 })
  })
  it('cannot bypass the cap with a manually entered URL or repeated query params', () => {
    expect(selectTags(['unknown,a,a,b', 'c,d'], ['a', 'b', 'c', 'd'], 2)).toEqual(['a', 'b'])
    expect(selectTags('unknown, c ,c,d', ['c', 'd'], 5)).toEqual(['c', 'd'])
  })
})
