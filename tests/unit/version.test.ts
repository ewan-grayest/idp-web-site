import { describe, expect, it } from 'vitest'
import { versionIncreased } from '../../scripts/check-version.mjs'

describe('commit version policy', () => {
  it('accepts patch, minor and major increases numerically', () => {
    expect(versionIncreased('0.1.9', '0.1.10')).toBe(true)
    expect(versionIncreased('0.1.9', '0.2.0')).toBe(true)
    expect(versionIncreased('0.9.9', '1.0.0')).toBe(true)
  })
  it('rejects unchanged, decreasing and malformed versions', () => {
    for (const next of ['0.1.9', '0.1.8', '0.0.10', 'v1.0.0', '1.0', '1.0.0-beta', '01.0.0']) expect(versionIncreased('0.1.9', next)).toBe(false)
  })
})
