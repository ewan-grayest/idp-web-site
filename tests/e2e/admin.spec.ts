import { expect, test } from '@playwright/test'

import { accountFor, password } from './accounts'

// Admin sign-in and sign-out, as this device's own test user (see global-setup.ts)
test('Log out in the admin header signs out, even with the side menu collapsed', async ({ page, isMobile }, testInfo) => {
  const email = accountFor(testInfo.project.name)
  await page.goto('/admin/login')
  await page.locator('#field-email').fill(email)
  await page.locator('#field-password').fill(password)
  await page.locator('button[type=submit]').click()
  await expect(page).toHaveURL(/\/admin$/)

  // Phones have room for Log out only
  if (!isMobile) await expect(page.getByRole('link', { name: /View site|Открыть сайт/ })).toHaveAttribute('href', '/')
  await page.locator('#admin-sign-out').click()
  await expect(page).toHaveURL(/\/admin\/login/)

  const me = await page.evaluate(async () => (await fetch('/api/v1/users/me')).json())
  expect(me.user).toBeNull()
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/login/)
})

test('Photo descriptions are optional; an empty one falls back to the project name', async ({ page, request }, testInfo) => {
  const email = accountFor(testInfo.project.name)
  await request.post('/api/v1/users/login', { data: { email, password } })
  // A 1×1 PNG, uploaded with no description at all
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
  const upload = await request.post('/api/v1/media', {
    multipart: { file: { name: 'no-alt.png', mimeType: 'image/png', buffer: png }, _payload: JSON.stringify({}) },
  })
  expect(upload.status(), await upload.text()).toBe(201)
  const media = (await upload.json()).doc
  const slug = `e2e-no-alt-${Date.now()}`
  const created = await request.post('/api/v1/projects', {
    data: { title: 'Проверка без описания', slug, kind: 'residential', gallery: [{ image: media.id }] },
  })
  expect(created.status(), await created.text()).toBe(201)
  const project = (await created.json()).doc
  try {
    await page.goto(`/projects/residential/${slug}`)
    await expect(page.locator('[data-spec="5.1"] img').first()).toHaveAttribute('alt', 'Проверка без описания')
  } finally {
    await request.delete(`/api/v1/projects/${project.id}`)
    await request.delete(`/api/v1/media/${media.id}`)
  }
})

test('RU / EN / 中 in the header switch the whole admin, field names included', async ({ page, isMobile }, testInfo) => {
  const email = accountFor(testInfo.project.name)
  await page.goto('/admin/login')
  await page.locator('#field-email').fill(email)
  await page.locator('#field-password').fill(password)
  await page.locator('button[type=submit]').click()
  await expect(page).toHaveURL(/\/admin$/)
  await page.goto('/admin/collections/projects/create')
  await page.waitForLoadState('networkidle')

  const anyLanguage = '(Язык интерфейса|Interface language|界面语言)'
  // Wide screens: RU / EN / 中 buttons; phones: a short list
  const choose = async (code: 'ru' | 'en' | 'zh', name: string) => {
    if (isMobile) await page.getByRole('combobox', { name: new RegExp(`^${anyLanguage}$`) }).selectOption(code)
    else await page.getByRole('button', { name: new RegExp(`^${anyLanguage}: ${name}$`) }).click()
  }
  const tab = (name: string) => page.locator('.tabs-field__tab-button', { hasText: name })
  const contentLanguage = (name: string) => page.locator('.localizer-button__label', { hasText: name }).locator('visible=true')

  await choose('en', 'English')
  await expect(tab('Main')).toBeVisible()
  await expect(page.getByText('Show in the Home slider', { exact: true })).toBeVisible()
  if (!isMobile) await expect(contentLanguage('Content language')).toBeVisible()
  // The content languages are named in the interface language too
  if (!isMobile) await expect(page.locator('.localizer-button__current-label').locator('visible=true')).toHaveText('Russian')

  await choose('zh', '中文')
  await expect(tab('基本信息')).toBeVisible()
  if (!isMobile) await expect(contentLanguage('内容语言')).toBeVisible()

  await choose('ru', 'Русский')
  await expect(tab('Основное')).toBeVisible()
  await expect(page.getByText('Показывать в слайдере на главной', { exact: true })).toBeVisible()
  if (!isMobile) await expect(contentLanguage('Язык контента')).toBeVisible()
})

test('The login page has the interface language switch, and the dashboard explains both switches', async ({ page }, testInfo) => {
  await page.goto('/admin/login')
  const languages = page.locator('[data-admin-languages]')
  await languages.getByRole('button', { name: /: English$/ }).click()
  await expect(page.locator('button[type=submit]')).toHaveText('Login')
  await languages.getByRole('button', { name: /: Русский$/ }).click()
  await expect(page.locator('button[type=submit]')).toHaveText('Войти')

  await page.locator('#field-email').fill(accountFor(testInfo.project.name))
  await page.locator('#field-password').fill(password)
  await page.locator('button[type=submit]').click()
  await expect(page).toHaveURL(/\/admin$/)
  const guide = page.locator('[data-admin-guide]')
  await expect(guide.getByRole('heading')).toHaveText('Языки в админке')
  await expect(guide).toContainText('Язык контента')
})

test('A project saves with unfinished products; a product without a partner shows its name only', async ({ page, request }, testInfo) => {
  test.setTimeout(90_000)
  await request.post('/api/v1/users/login', { data: { email: accountFor(testInfo.project.name), password } })
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
  const upload = await request.post('/api/v1/media', {
    multipart: { file: { name: 'hotspot.png', mimeType: 'image/png', buffer: png }, _payload: JSON.stringify({}) },
  })
  const media = (await upload.json()).doc
  const partner = (await (await request.get('/api/v1/partners?limit=1&depth=0')).json()).docs[0]
  const slug = `e2e-hotspot-${Date.now()}`
  // Ewan's project 12: an empty product row, one with only a name, then two placed ones: with and without a partner
  const created = await request.post('/api/v1/projects', {
    data: {
      title: 'Проверка товаров',
      slug,
      kind: 'residential',
      gallery: [
        {
          image: media.id,
          hotspots: [{}, { label: 'Диван' }, { label: 'Кресло', partner: partner.id, x: 70, y: 70 }, { label: 'Зеркало', x: 30, y: 30 }],
        },
      ],
    },
  })
  expect(created.status(), await created.text()).toBe(201)
  const project = (await created.json()).doc
  try {
    await page.goto(`/projects/residential/${slug}`)
    await page.locator('[data-spec="5.1"] img').first().click()
    await expect(page.locator('[data-spec="5.1.4"]')).toBeVisible()
    await page.getByRole('button', { name: 'Показать или скрыть товары' }).click()
    const spots = page.locator('[data-spec="5.1.3"]')
    await expect(spots).toHaveCount(2)
    await expect(page.locator('a[data-spec="5.1.3"]')).toContainText('Кресло')
    await expect(page.locator('a[data-spec="5.1.3"]')).toContainText(partner.name)
    await expect(page.locator('[data-spec="5.1.3"][data-no-shop]')).toHaveText('Зеркало')
    await expect(page.locator('a[data-spec="5.1.3"]', { hasText: 'Зеркало' })).toHaveCount(0)

    // The admin marks the product without a partner (desktop: the admin on phones is checked elsewhere)
    if (testInfo.project.name !== 'phone') {
      await page.goto('/admin/login')
      await page.locator('#field-email').fill(accountFor(testInfo.project.name))
      await page.locator('#field-password').fill(password)
      await page.locator('button[type=submit]').click()
      await expect(page).toHaveURL(/\/admin$/)
      await page.goto(`/admin/collections/projects/${project.id}`)
      await page.waitForLoadState('networkidle')
      await page.locator('.tabs-field__tab-button').nth(1).click()
      await expect(page.locator('[data-hotspot-no-partner]').first()).toBeVisible({ timeout: 20_000 })
    }
  } finally {
    await request.delete(`/api/v1/projects/${project.id}`)
    await request.delete(`/api/v1/media/${media.id}`)
  }
})

test('Products are placed on the photo in the admin: a click adds one, dragging moves it', async ({ page, request, isMobile }, testInfo) => {
  test.skip(isMobile, 'placing products is a desktop task')
  test.setTimeout(90_000)
  const email = accountFor(testInfo.project.name)
  await request.post('/api/v1/users/login', { data: { email, password } })
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
  const media = (await (await request.post('/api/v1/media', {
    multipart: { file: { name: 'picker.png', mimeType: 'image/png', buffer: png }, _payload: JSON.stringify({}) },
  })).json()).doc
  const slug = `e2e-picker-${Date.now()}`
  const project = (await (await request.post('/api/v1/projects', {
    data: { title: 'Проверка расстановки', slug, kind: 'residential', gallery: [{ image: media.id }] },
  })).json()).doc
  try {
    await page.goto('/admin/login')
    await page.locator('#field-email').fill(email)
    await page.locator('#field-password').fill(password)
    await page.locator('button[type=submit]').click()
    await expect(page).toHaveURL(/\/admin$/)
    await page.goto(`/admin/collections/projects/${project.id}`)
    await page.waitForLoadState('networkidle')
    await page.locator('.tabs-field__tab-button').nth(1).click()
    const picker = page.locator('[data-hotspot-picker]').first()
    await expect(picker.locator('img')).toBeVisible({ timeout: 20_000 })
    await picker.scrollIntoViewIfNeeded()
    const img = (await picker.locator('img').boundingBox())!
    await page.mouse.click(img.x + img.width * 0.25, img.y + img.height * 0.5)
    const dot = picker.getByRole('button')
    await expect(dot).toHaveCount(1)
    await dot.dragTo(picker.locator('img'), { targetPosition: { x: img.width * 0.75, y: img.height * 0.2 } })
    await page.locator('#action-save').click()
    await expect.poll(async () => {
      const doc = await (await request.get(`/api/v1/projects/${project.id}?depth=0`)).json()
      const h = doc.gallery[0].hotspots?.[0]
      return h ? [Math.round(h.x), Math.round(h.y)] : null
    }).toEqual([75, 20])
  } finally {
    await request.delete(`/api/v1/projects/${project.id}`)
    await request.delete(`/api/v1/media/${media.id}`)
  }
})
