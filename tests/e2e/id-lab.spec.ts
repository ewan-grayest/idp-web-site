import { expect, test } from '@playwright/test'

import { accountFor, password } from './accounts'

// Product design took the place of archive projects and lives on the ID Lab page; each project has
// «Публиковать на сайте» (Ewan, 2026-11-05). Test projects are product design so the residential and public lists
// other specs count stay as they are.

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'idp-intro-session', value: '1', url: baseURL! }])
})

test('Archive addresses lead to ID Lab, which the footer links to', async ({ page }) => {
  await page.goto('/projects/archive')
  await expect(page).toHaveURL(/\/id-lab$/)
  await expect(page.locator('[data-spec="7.1"] h1')).toHaveText('ID Lab')
  await expect(page.locator('footer [data-spec="0.3.7"]')).toHaveAttribute('href', '/id-lab')

  await page.goto('/projects/product')
  await expect(page).toHaveURL(/\/id-lab$/)
  await page.goto('/en/projects/archive')
  await expect(page).toHaveURL(/\/en\/id-lab$/)
  await page.goto('/projects/archive/no-such-project')
  await expect(page).toHaveURL(/\/id-lab\/no-such-project$/)
})

test('Unpublished: gone from the site and the public API, previewed by staff; published: back everywhere', async ({ page, request }, testInfo) => {
  await request.post('/api/v1/users/login', { data: { email: accountFor(testInfo.project.name), password } })
  const slug = `e2e-unpublished-${testInfo.project.name}-${Date.now()}`
  const title = `Проверка публикации ${testInfo.project.name}`
  const created = await request.post('/api/v1/projects', { data: { title, slug, kind: 'product', publishOnSite: false } })
  expect(created.status(), await created.text()).toBe(201)
  const project = (await created.json()).doc
  try {
    // A visitor: 404, not in the ID Lab list, not in the API, no short link
    expect((await page.goto(`/id-lab/${slug}`))?.status()).toBe(404)
    await page.goto('/id-lab')
    await expect(page.locator('[data-spec="7.2"]')).not.toContainText(title)
    const api = await page.request.get('/api/v1/projects', { params: { 'where[slug][equals]': slug, depth: 0 } })
    expect((await api.json()).docs).toHaveLength(0)
    expect((await page.goto(`/p/${project.shortCode}`))?.status()).toBe(404)

    // Signed-in staff: the page opens with a note, as in «Предпросмотр»
    const staff = await page.context().browser()!.newContext({ storageState: await request.storageState() })
    const preview = await staff.newPage()
    expect((await preview.goto(`/id-lab/${slug}`))?.status()).toBe(200)
    await expect(preview.getByRole('note')).toContainText('Проект не опубликован')
    await staff.close()

    // Published: visible to visitors, without the note
    const saved = await request.patch(`/api/v1/projects/${project.id}`, { data: { publishOnSite: true } })
    expect(saved.ok(), await saved.text()).toBeTruthy()
    expect((await page.goto(`/id-lab/${slug}`))?.status()).toBe(200)
    await expect(page.getByRole('note')).toHaveCount(0)
    await page.goto('/id-lab')
    await expect(page.locator('[data-spec="7.2"]')).toContainText(title)
  } finally {
    await request.delete(`/api/v1/projects/${project.id}`)
  }
})
