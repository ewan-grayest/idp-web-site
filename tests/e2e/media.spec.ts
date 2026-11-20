import { expect, test, type Page, type TestInfo } from '@playwright/test'
import sharp from 'sharp'

import { accountFor, password } from './accounts'

// «Фото и видео» in the admin and what the site does with it (Ewan, 2026-11-20): thumbnails square or in the file's own
// proportions, any file full screen, a focal point the site crops around, and tags on photos

async function signIn(page: Page, testInfo: TestInfo) {
  await page.goto('/admin/login')
  await page.locator('#field-email').fill(accountFor(testInfo.project.name))
  await page.locator('#field-password').fill(password)
  await page.locator('button[type=submit]').click()
  await expect(page).toHaveURL(/\/admin$/)
}

/** A 3:2 photo, uploaded through the page's session, so the cleanup can delete it. */
async function upload(page: Page, name: string, data: Record<string, unknown> = {}) {
  const buffer = await sharp({ create: { width: 300, height: 200, channels: 3, background: { r: 120, g: 150, b: 190 } } }).jpeg().toBuffer()
  const res = await page.request.post('/api/v1/media', {
    multipart: { file: { name, mimeType: 'image/jpeg', buffer }, _payload: JSON.stringify(data) },
  })
  expect(res.status(), await res.text()).toBe(201)
  return (await res.json()).doc as { id: number; filename: string }
}

const unique = (testInfo: TestInfo, what: string) => `e2e-${what}-${testInfo.project.name}-${Date.now()}`

test('The media list shows thumbnails square or as the file, and opens any file full screen', async ({ page }, testInfo) => {
  await signIn(page, testInfo)
  const media = await upload(page, `${unique(testInfo, 'thumbs')}.jpg`)
  try {
    await page.goto(`/admin/collections/media?where[id][equals]=${media.id}`)
    const cell = page.locator('[data-media-cell]').first()
    await expect(cell).toHaveAttribute('data-thumbs', 'square')
    let box = (await cell.locator('img').boundingBox())!
    expect(Math.round(box.width)).toBe(Math.round(box.height))

    await page.locator('[data-media-thumbs-switch] button').nth(1).click()
    await expect(cell).toHaveAttribute('data-thumbs', 'original')
    box = (await cell.locator('img').boundingBox())!
    // 80px high, as wide as 3:2 makes it
    expect(Math.round(box.height)).toBe(80)
    expect(Math.round(box.width)).toBe(120)

    // Each person's choice stays in their browser
    await page.reload()
    await expect(page.locator('[data-media-cell]').first()).toHaveAttribute('data-thumbs', 'original')

    await page.locator('[data-media-cell] [data-media-fullscreen]').first().click()
    const lightbox = page.locator('[data-media-lightbox]')
    await expect(lightbox).toBeVisible()
    await expect(lightbox.locator('img')).toHaveAttribute('src', new RegExp(media.filename.replace('.', '\\.')))
    await page.keyboard.press('Escape')
    await expect(lightbox).toHaveCount(0)
  } finally {
    await page.request.delete(`/api/v1/media/${media.id}`)
  }
})

test('A focal point set on the file page moves the site’s crop', async ({ page }, testInfo) => {
  await signIn(page, testInfo)
  const media = await upload(page, `${unique(testInfo, 'focus')}.jpg`)
  const slug = unique(testInfo, 'focus')
  const created = await page.request.post('/api/v1/projects', { data: { title: 'Проверка фокус-точки', slug, kind: 'residential', gallery: [{ image: media.id }] } })
  expect(created.status(), await created.text()).toBe(201)
  const project = (await created.json()).doc
  try {
    await page.goto(`/admin/collections/media/${media.id}`)
    const grid = page.locator('[data-crop-grid]')
    await expect(grid.locator('[data-crop-point]')).toContainText('50%')
    // Every place on the site, each in miniature
    await expect(grid.locator('[data-crop-format]').first()).toBeVisible()

    const dot = grid.locator('[data-crop-focus]')
    await dot.focus()
    await page.keyboard.press('Shift+ArrowRight')
    await page.keyboard.press('Shift+ArrowRight')
    await page.keyboard.press('Shift+ArrowUp')
    await expect(grid.locator('[data-crop-point]')).toContainText(/70%.*40%/)

    // Unticking a group leaves its places out
    const before = await grid.locator('[data-crop-format]').count()
    await grid.locator('[data-crop-group=home]').uncheck()
    expect(await grid.locator('[data-crop-format]').count()).toBeLessThan(before)
    await grid.locator('[data-crop-group=home]').check()

    await page.locator('#action-save').click()
    await expect
      .poll(async () => {
        const doc = await (await page.request.get(`/api/v1/media/${media.id}?depth=0`)).json()
        return `${doc.focalX} ${doc.focalY}`
      })
      .toBe('70 40')

    await page.goto(`/projects/residential/${slug}`)
    const photo = page.locator('[data-spec="5.1"] img').first()
    await expect(photo).toHaveCSS('object-position', '70% 40%')
  } finally {
    await page.request.delete(`/api/v1/projects/${project.id}`)
    await page.request.delete(`/api/v1/media/${media.id}`)
  }
})

test('Photo tags: under the photo when the file says so, for search engines always', async ({ page }, testInfo) => {
  await signIn(page, testInfo)
  const tagSlug = unique(testInfo, 'tag')
  const madeTag = await page.request.post('/api/v1/tags', { data: { title: 'Тег фото для проверки', slug: tagSlug } })
  expect(madeTag.status(), await madeTag.text()).toBe(201)
  const tag = (await madeTag.json()).doc
  const shown = await upload(page, `${unique(testInfo, 'shown')}.jpg`, { tags: [tag.id], showTags: true })
  const hidden = await upload(page, `${unique(testInfo, 'hidden')}.jpg`, { tags: [tag.id], showTags: false })
  const slug = unique(testInfo, 'tags')
  const created = await page.request.post('/api/v1/projects', {
    data: { title: 'Проверка тегов фото', slug, kind: 'residential', gallery: [{ image: shown.id }, { image: hidden.id }] },
  })
  expect(created.status(), await created.text()).toBe(201)
  const project = (await created.json()).doc
  try {
    await page.goto(`/projects/residential/${slug}`)
    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}')
    expect(ld.image).toHaveLength(2)
    for (const image of ld.image) expect(image.keywords).toBe('Тег фото для проверки')

    await page.locator('[data-spec="5.1"] button').first().click()
    const tags = page.locator('[data-photo-tags] a')
    await expect(tags).toHaveText(['Тег фото для проверки'])
    await expect(tags.first()).toHaveAttribute('href', `/projects/residential?tags=${tagSlug}`)
    // The second photo keeps its tags to search engines
    await page.getByRole('button', { name: /Следующ|Next/ }).click()
    await expect(page.locator('[data-photo-tags]')).toHaveCount(0)
    await page.getByRole('button', { name: /Предыдущ|Previous/ }).click()

    // The link finds the project: its photos' shown tags count as its own in the list filter
    await tags.first().click()
    await expect(page).toHaveURL(new RegExp(`tags=${tagSlug}`))
    await expect(page.getByRole('link', { name: 'Проверка тегов фото' })).toBeVisible()
  } finally {
    await page.request.delete(`/api/v1/projects/${project.id}`)
    await page.request.delete(`/api/v1/media/${shown.id}`)
    await page.request.delete(`/api/v1/media/${hidden.id}`)
    await page.request.delete(`/api/v1/tags/${tag.id}`)
  }
})
