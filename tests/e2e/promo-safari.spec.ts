import { expect, test, type Page } from '@playwright/test'

// Safari on a Mac (2026-11-06): the promo waited with the play button, and the first click on it only turned the sound
// on. Safari refuses sound before a click, like the other browsers, and also aborts play() while the video is still
// loading (WebKit bug 255024); some setups refuse even a muted start. Headless Chromium does none of that, so the page
// gets stand-ins, as in promo-sound.spec.ts.
async function emulate(page: Page, rule: 'safari' | 'refuse-all') {
  await page.addInitScript((rule) => {
    let active = false
    for (const e of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(e, () => (active = true), true)
    let aborted = false
    const play = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function () {
      const refused = !active && (rule === 'refuse-all' || !this.muted)
      if (refused) return Promise.reject(new DOMException('Not before a click', 'NotAllowedError'))
      if (rule === 'safari' && !aborted) {
        aborted = true
        return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'))
      }
      return play.call(this)
    }
  }, rule)
}

test('Safari aborts the first start: the promo still starts by itself, muted', async ({ page }) => {
  await emulate(page, 'safari')
  for (const path of ['/', '/promo']) {
    await page.goto(path)
    const video = page.locator('[data-spec="2"] video')
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.3)
    expect(await video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true)
    await expect(page.locator('[data-spec="2.2"]')).toHaveCount(0)
  }
})

test('A browser that refuses even a muted start: one click on the play button starts the promo with sound', async ({ page }) => {
  await emulate(page, 'refuse-all')
  await page.goto('/promo')
  const button = page.locator('[data-spec="2.2"]')
  await expect(button).toBeVisible()
  if (test.info().project.name === 'phone') await button.tap()
  else await button.click()
  const video = page.locator('[data-spec="2"] video')
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.3)
  expect(await video.evaluate((v: HTMLVideoElement) => [v.paused, v.muted])).toEqual([false, false])
})
