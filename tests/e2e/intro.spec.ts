import { expect, test, type Page } from '@playwright/test'

// Home plays the promo video (page 2) by itself on each new visit, once per browser session.
// Without an upload in Студия → Промо-видео it is the placeholder clip from public/.

/** Where the browser kept the sound off, the first click only turns it on, as the hint says (promo-sound.spec.ts) */
async function turnSoundOn(page: Page) {
  await page.waitForTimeout(300)
  if (!(await page.locator('[data-sound-hint]').count())) return
  await page.locator('[data-promo-screen]').click({ position: { x: 100, y: 200 } })
  await expect(page.locator('[data-sound-hint]')).toHaveCount(0)
  expect(await page.locator('[data-spec="2"] video').evaluate((v: HTMLVideoElement) => [v.paused, v.muted])).toEqual([false, false])
  await page.waitForTimeout(700)
}

test('First visit: the promo video plays over Home, and only once', async ({ page, context }) => {
  await page.goto('/')
  const intro = page.locator('[data-spec="2"][data-intro]')
  await expect(intro).toBeVisible()
  await expect.poll(() => intro.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.3)
  const seen = (await context.cookies()).find((c) => c.name === 'idp-intro-session')
  // A session cookie: it ends with the browser session, so the next visit plays the video again
  expect(seen?.expires).toBe(-1)
  await page.reload()
  await expect(page.locator('[data-spec="2"]')).toHaveCount(0)
  await expect(page.locator('[data-spec="1.2"]')).toBeVisible()
})

test('Closing the intro shows Home; the logo then opens the Promo page', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.locator('[data-spec="2.1"]').click()
  await expect(page.locator('[data-spec="2"]')).toHaveCount(0)
  await page.locator('[data-spec="1.1"]').click()
  await expect(page).toHaveURL(/\/promo$/)
})

test('Escape closes the intro', async ({ page }) => {
  await page.goto('/en')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('[data-spec="2"][data-intro]')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-spec="2"]')).toHaveCount(0)
  await expect(page.locator('[data-spec="1.1"]')).toHaveAttribute('href', '/en/promo')
})

test('The intro gives way to Home when the video ends', async ({ page }) => {
  await page.goto('/')
  const video = page.locator('[data-spec="2"] video')
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => (v.paused ? 0 : v.duration || 0))).toBeGreaterThan(1)
  await video.evaluate((v: HTMLVideoElement) => {
    v.currentTime = v.duration - 0.3
  })
  await expect(page.locator('[data-spec="2"]')).toHaveCount(0)
  await expect(page.locator('[data-spec="1.2"]')).toBeVisible()
})

test('The Promo page itself still plays the video and closes to Home', async ({ page }) => {
  await page.goto('/promo')
  const promo = page.locator('[data-spec="2"]')
  await expect(promo).not.toHaveAttribute('data-intro')
  await expect.poll(() => promo.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.3)
  await expect(page.locator('[data-spec="2.1"]')).toHaveAttribute('href', '/')
})

test('/?intro plays the video again for a returning visitor', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'idp-intro-session', value: '1', url: baseURL! }])
  await page.goto('/?intro')
  const intro = page.locator('[data-spec="2"][data-intro]')
  await expect(intro).toBeVisible()
  await expect.poll(() => intro.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.3)
})

test('A click on the playing video closes the intro and shows Home (Ewan, 2026-11-12)', async ({ page }) => {
  await page.goto('/')
  const intro = page.locator('[data-spec="2"][data-intro]')
  const video = intro.locator('video')
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.3)
  await turnSoundOn(page)
  const box = (await page.locator('[data-promo-screen]').boundingBox())!
  if (test.info().project.name === 'phone') await page.touchscreen.tap(box.width / 2, box.height / 2)
  else await page.mouse.click(box.width / 2, box.height / 2)
  await expect(page.locator('[data-spec="2"]')).toHaveCount(0)
  await expect(page.locator('[data-spec="1.2"]')).toBeVisible()
  await page.reload()
  await expect(page.locator('[data-spec="1.2"]')).toBeVisible()
  await expect(page.locator('[data-spec="2"]')).toHaveCount(0)
})

test('A double click on the intro is one click: it closes, and the second click does not open a Home slide', async ({ page }) => {
  await page.goto('/')
  const video = page.locator('[data-spec="2"][data-intro] video')
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.3)
  await turnSoundOn(page)
  const box = (await page.locator('[data-promo-screen]').boundingBox())!
  if (test.info().project.name === 'phone') {
    await page.touchscreen.tap(box.width / 2, box.height / 2)
    await page.touchscreen.tap(box.width / 2, box.height / 2)
  } else await page.mouse.dblclick(box.width / 2, box.height / 2)
  await expect(page.locator('[data-spec="2"]')).toHaveCount(0)
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('[data-spec="1.2"]')).toBeVisible()
})

test('A click on the Promo page goes Home, and Home then opens without the video', async ({ page }) => {
  await page.goto('/en/promo')
  const video = page.locator('[data-spec="2"] video')
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.3)
  await turnSoundOn(page)
  await page.locator('[data-promo-screen]').click({ position: { x: 100, y: 200 } })
  await expect(page).toHaveURL(/\/en$/)
  await expect(page.locator('[data-spec="1.2"]')).toBeVisible()
  await expect(page.locator('[data-spec="2"]')).toHaveCount(0)
})

test('The Promo page goes Home when the video ends; Escape does too', async ({ page }) => {
  await page.goto('/promo')
  const video = page.locator('[data-spec="2"] video')
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => (v.paused ? 0 : v.duration || 0))).toBeGreaterThan(1)
  await video.evaluate((v: HTMLVideoElement) => {
    v.currentTime = v.duration - 0.3
  })
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('[data-spec="1.2"]')).toBeVisible()
  await expect(page.locator('[data-spec="2"]')).toHaveCount(0)
  await page.goto('/promo')
  await page.waitForLoadState('networkidle')
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/\/$/)
})

test('Until the video starts, its first frame is the background', async ({ page }) => {
  await page.goto('/promo')
  const video = page.locator('[data-spec="2"] video')
  // The start time in the address makes Safari on iPhone draw the first frame before playback
  expect(await video.evaluate((v: HTMLVideoElement) => v.currentSrc)).toMatch(/#t=0\.001$/)
  await expect(page.locator('[data-promo-background]')).toHaveCount(0)
})
