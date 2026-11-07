import { describe, expect, it } from 'vitest'
import { dataDirs } from '../../src/lib/dataDirs'

describe('data folders', () => {
  it('uses folders in the site folder for npm run dev', () => {
    expect(dataDirs({})).toEqual({ media: 'media', backup: 'backups' })
  })
  it('uses the container paths when they are set', () => {
    expect(dataDirs({ MEDIA_DIR: '/data/media', BACKUPS_DIR: '/data/backup' })).toEqual({ media: '/data/media', backup: '/data/backup' })
  })
})
