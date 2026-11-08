import { describe, expect, it } from 'vitest'
import { isUploadEntry } from '../../src/lib/backups'

describe('what a backup takes from the upload folder', () => {
  it('takes uploaded files and folders', () => {
    for (const name of ['photo.jpg', 'photo-1600x1200.webp', '.hidden-upload.png', 'lost+found.jpg']) expect(isUploadEntry(name)).toBe(true)
  })
  it('leaves out the lost+found of a host disk', () => {
    expect(isUploadEntry('lost+found')).toBe(false)
  })
  it('leaves out what an interrupted restore left behind', () => {
    expect(isUploadEntry('.idp-restore-new-20261108155929')).toBe(false)
    expect(isUploadEntry('.idp-restore-old-20261108155929')).toBe(false)
  })
})
