import { describe, expect, it } from 'vitest'
import { dataDirs } from '../../src/lib/dataDirs'

describe('data folders', () => {
  it('uses ./data by default, as docker compose does in the local environment', () => {
    expect(dataDirs({})).toEqual({ media: 'data/media', backup: 'data/backup' })
  })
  it('follows DATA_DIR', () => {
    expect(dataDirs({ DATA_DIR: '/srv/idp/data/' })).toEqual({ media: '/srv/idp/data/media', backup: '/srv/idp/data/backup' })
    expect(dataDirs({ DATA_DIR: '/' })).toEqual({ media: '/media', backup: '/backup' })
  })
  it('lets the containers name each folder', () => {
    expect(dataDirs({ DATA_DIR: 'x', MEDIA_DIR: '/data/media', BACKUPS_DIR: '/data/backup' })).toEqual({
      media: '/data/media',
      backup: '/data/backup',
    })
  })
})
