import { describe, expect, it } from 'vitest'

import { slideNameHidden } from '@/lib/slideNames'

describe('names on the Home slides', () => {
  it('follow each project while the site setting leaves it to them', () => {
    expect(slideNameHidden('project', true)).toBe(false)
    expect(slideNameHidden('project', false)).toBe(true)
  })

  it('show on every slide when the site setting says so, even where a project hides its name', () => {
    expect(slideNameHidden('show', false)).toBe(false)
    expect(slideNameHidden('show', true)).toBe(false)
  })

  it('hide on every slide when the site setting says so, even where a project shows its name', () => {
    expect(slideNameHidden('hide', true)).toBe(true)
    expect(slideNameHidden('hide', false)).toBe(true)
  })

  it('treat unset values as the defaults: left to each project, name shown', () => {
    expect(slideNameHidden(undefined, undefined)).toBe(false)
    expect(slideNameHidden(null, null)).toBe(false)
    expect(slideNameHidden(null, false)).toBe(true)
  })
})
