import { expect, test } from '@playwright/test'

// Page 4. Needs the sample data: npx payload run scripts/seed.ts
const PERSON = '/team/sample-architect'

test('Person page: name in the header, quote, interests, achievements and projects', async ({ page }) => {
  await page.goto(PERSON)
  await page.waitForLoadState('networkidle')
  await expect(page.locator('[data-spec="4.1.3"]')).toHaveText('[ФАМИЛИЯ Имя]')
  await expect(page.locator('[data-spec="0.1.2"]')).toHaveText('[ФАМИЛИЯ Имя]')
  await expect(page.locator('[data-spec="4.1.4"]')).toBeVisible()
  await expect(page.locator('[data-spec="4.1.5"]')).toContainText('Интересы')
  await expect(page.locator('[data-spec="4.2.2"] [role="tab"]').first()).toHaveText(/2026/)
  await expect(page.locator('[data-spec="4.3.2"]')).toHaveCount(2)
  await expect(page.locator('[data-spec="4.3.2"]').first()).toHaveAttribute('href', /^\/projects\/(residential|public)\/sample-/)
  await expect(page.locator('[data-spec="4.3.3"]').first()).toHaveAttribute('href', /\?tags=/)
})

test('"Ask me" opens the enquiry with the person as context', async ({ page }) => {
  await page.goto(PERSON)
  await page.waitForLoadState('networkidle')
  await page.locator('[data-spec="4.4.1"]').click()
  await expect(page.locator('[data-spec="0.1.2"]')).toContainText('Вопрос · [ФАМИЛИЯ Имя]')
  await expect(page.locator('[data-spec="0.1.7"]')).toBeFocused()
})

test('Team strip and project author lead here; unknown people are a 404', async ({ page }) => {
  await page.goto('/studio?project=sample-loft#team')
  await page.locator('[data-spec="3.2.2"]').first().click()
  await page.locator('[data-spec="3.2.6"]').click()
  await expect(page).toHaveURL(new RegExp(`${PERSON}$`))
  expect((await page.goto('/team/no-such-person'))?.status()).toBe(404)
})

test('Header search finds people as well as projects', async ({ page }) => {
  await page.goto('/studio')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Поиск' }).click()
  await page.keyboard.type('ФАМИЛИЯ')
  const hit = page.locator('[data-spec="0.1.12"] a', { hasText: 'Ведущий архитектор' })
  await expect(hit).toHaveAttribute('href', PERSON)
})

test('Timeline years magnify under the mouse like the macOS Dock, and settle back', async ({ page, isMobile }) => {
  test.skip(isMobile, 'mouse only')
  await page.goto(PERSON)
  await page.waitForLoadState('networkidle')
  const tabs = page.locator('[data-spec="4.2.2"] [data-dock] [role="tab"]')
  expect(await tabs.count()).toBeGreaterThan(1)
  const scale = (k: number) => tabs.nth(k).evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a)
  const box = (await tabs.nth(0).boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 8)
  await expect.poll(() => scale(0)).toBeGreaterThan(1.35)
  const next = await scale(1)
  expect(next).toBeGreaterThanOrEqual(1)
  expect(next).toBeLessThan(await scale(0))
  await page.mouse.move(box.x + box.width / 2, box.y - 200)
  await expect.poll(() => scale(0)).toBeCloseTo(1, 2)
})
