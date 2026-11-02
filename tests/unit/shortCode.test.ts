import { describe, expect, it } from 'vitest'

import { makeShortCode, shortPath } from '@/lib/shortCode'

describe('short links 5.7.4', () => {
  it('makes readable 5-character codes without look-alike characters', () => {
    for (let k = 0; k < 200; k++) expect(makeShortCode()).toMatch(/^[a-km-zA-HJ-NP-Z2-9]{5}$/)
  })
  it('serves them under /p/', () => {
    expect(shortPath('abcde')).toBe('/p/abcde')
  })
})
