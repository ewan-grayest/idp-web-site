import { expect, test } from '@playwright/test'

// Needs the sample data: npx payload run scripts/seed.ts
const LOFT = '/projects/residential/sample-loft'
const CAFE = '/projects/public/sample-cafe'

test('Strip frame opens the viewer; products show only when switched on, inside the photo; Esc closes it', async ({ page }) => {
  await page.goto(LOFT)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Открыть кадр 1', exact: true }).click()
  const viewer = page.locator('[data-spec="5.1-a"]')
  await expect(viewer).toBeVisible()
  const products = viewer.locator('[data-spec="5.1.3"]')
  const toggle = viewer.getByRole('button', { name: 'Показать или скрыть товары' })
  // Hidden at first; the switch is highlighted because this photo has products
  await expect(products).toHaveCount(0)
  await expect(toggle).toHaveAttribute('data-has-products', 'true')
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(products.first()).toHaveAttribute('href', /^\/partners#/)
  const frame = (await viewer.locator('[data-spec="5.1.2"] > div').boundingBox())!
  for (const label of await viewer.locator('[data-spec="5.1.3"] span:last-child').all()) {
    const b = (await label.boundingBox())!
    expect(b.x).toBeGreaterThanOrEqual(frame.x - 1)
    expect(b.x + b.width).toBeLessThanOrEqual(frame.x + frame.width + 1)
  }

  await toggle.click()
  await expect(products).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(viewer).toHaveCount(0)
})

test('Project CTA opens the enquiry with the project as context', async ({ page }) => {
  await page.goto(LOFT)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Узнать больше о проекте' }).click()
  await expect(page.locator('[data-spec="0.1.2"]')).toContainText('Узнать больше о проекте · [Пример] Лофт')
  await expect(page.locator('[data-spec="0.1.7"]')).toBeFocused()
})

test('Price enquiry 5.7.5 only on public projects', async ({ page }) => {
  await page.goto(LOFT)
  await expect(page.locator('[data-spec="5.7.5"]')).toHaveCount(0)
  await page.goto(CAFE)
  await expect(page.locator('[data-spec="5.7.5"]')).toBeVisible()
})

test('Short link redirects to the project', async ({ page, request }) => {
  const res = await request.get('/api/v1/projects?where[slug][equals]=sample-loft&depth=0')
  const code = (await res.json()).docs[0].shortCode
  await page.goto(`/p/${code}`)
  await expect(page).toHaveURL(new RegExp(`${LOFT}$`))
})

test('Unknown project kind or slug is a 404', async ({ page }) => {
  expect((await page.goto('/projects/residential/no-such-project'))?.status()).toBe(404)
  expect((await page.goto('/projects/castles/sample-loft'))?.status()).toBe(404)
})

test('5.1: the photo under the pointer widens', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Touch screens have no hover')
  await page.goto('/projects/residential/sample-loft')
  await page.waitForLoadState('networkidle')
  const frame = page.locator('[data-spec="5.1"] button').nth(2)
  const before = (await frame.boundingBox())!.width
  await frame.hover()
  await expect.poll(async () => (await frame.boundingBox())!.width).toBeGreaterThan(before * 2)
})
