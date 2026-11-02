import { expect, test, type Page } from '@playwright/test'

// Page 1 sliders. Needs the sample data (npx payload run scripts/seed.ts): four projects ticked for Home on each side.
// Starts as a returning visitor, so the first-visit promo video (intro.spec.ts) stays out of the way.
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'idp-intro-session', value: '1', url: baseURL! }])
})

const half = (page: Page, spec: '1.2' | '1.3') => page.locator(`[data-spec="${spec}"]`)
const counter = (page: Page, spec: '1.2' | '1.3') => page.locator(`[data-spec="${spec}.1"]`)

test('Each slide is a project: its kind, name and «Смотреть проект», and a click opens it', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const left = half(page, '1.2')
  await expect(left).toContainText('Общественные интерьеры')
  await expect(left).toContainText('[Пример] Кафе «Кирпич»')
  await expect(left.getByRole('link')).toHaveAttribute('href', '/projects/public/sample-cafe')
  await expect(half(page, '1.3')).toContainText('[Пример] Лофт на Солянке')
  await left.getByText('Смотреть проект').click()
  await expect(page).toHaveURL(/\/projects\/public\/sample-cafe$/)
})

test('‹ › and the segments change the project, and the counter follows', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const left = half(page, '1.2')
  await expect(counter(page, '1.2')).toContainText('01 / 04')
  await left.getByRole('button', { name: 'Следующий проект' }).click()
  await expect(counter(page, '1.2')).toContainText('02 / 04')
  await expect(left.getByRole('link')).toHaveAttribute('href', '/projects/public/sample-showroom')
  await expect(left).toContainText('[Пример] Шоурум мебели на Тверской')
  await left.getByRole('button', { name: 'Предыдущий проект' }).click()
  await left.getByRole('button', { name: 'Предыдущий проект' }).click()
  await expect(counter(page, '1.2')).toContainText('04 / 04')
  // Segments: mouse shortcuts to each project
  await counter(page, '1.2').locator('button[aria-hidden="true"]').nth(2).click()
  await expect(counter(page, '1.2')).toContainText('03 / 04')
  await expect(left.getByRole('link')).toHaveAttribute('href', '/projects/public/sample-office')
})

test('The slides move on by themselves', async ({ page }) => {
  await page.goto('/')
  await expect(counter(page, '1.3')).toContainText('01 / 04')
  await expect(counter(page, '1.3')).toContainText('02 / 04', { timeout: 10_000 })
  await expect(half(page, '1.3').getByRole('link')).toHaveAttribute('href', '/projects/residential/sample-patriarshie')
})

test('Pointing at a half pauses the slide show and says so', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Phones have no pointer to rest on a half')
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const home = page.locator('[data-spec="1"]')
  await expect(async () => {
    await page.mouse.move(250, 450, { steps: 4 })
    await expect(home).toHaveAttribute('data-hover', 'left', { timeout: 500 })
  }).toPass()
  await expect(counter(page, '1.2')).toContainText('Пауза')
  await page.waitForTimeout(7_000)
  await expect(counter(page, '1.2')).toContainText('01 / 04')
  // The other side's name waits at the far edge
  await expect(page.getByText('Жилые интерьеры', { exact: true }).last()).toBeVisible()
  await page.mouse.move(720, 450, { steps: 12 })
  await expect(counter(page, '1.2')).not.toContainText('Пауза')
})

test('Phones: a swipe changes the slide and does not open the project', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Swipes are for touch screens')
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const box = (await half(page, '1.3').boundingBox())!
  const y = box.y + box.height / 2
  const cdp = await page.context().newCDPSession(page)
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] })
  await touch('touchStart', box.x + box.width * 0.8)
  for (const f of [0.7, 0.55, 0.4, 0.25]) await touch('touchMove', box.x + box.width * f)
  await touch('touchEnd', box.x + box.width * 0.25)
  await expect(counter(page, '1.3')).toContainText('02 / 04')
  await page.waitForTimeout(500)
  await expect(page).toHaveURL(/\/$/)
})
