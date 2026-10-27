import { expect, test } from '@playwright/test'

// Browsers refuse a video with sound until the visitor has clicked, tapped or pressed a key on the site.
// Headless Chromium does not apply that rule reliably, so the page gets a stand-in for it.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    let active = false
    for (const e of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(e, () => (active = true), true)
    const play = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function () {
      if (!this.muted && !active) return Promise.reject(new DOMException('No sound before a click', 'NotAllowedError'))
      return play.call(this)
    }
  })
})

test('The promo starts muted, and the first click or tap turns the sound on without pausing it', async ({ page }) => {
  await page.goto('/')
  const video = page.locator('[data-spec="2"][data-intro] video')
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.3)
  expect(await video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true)
  const box = (await page.locator('[data-close-on-double]').boundingBox())!
  if (test.info().project.name === 'phone') await page.touchscreen.tap(box.width / 2, box.height / 2)
  else await page.mouse.click(box.width / 2, box.height / 2)
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(false)
  await page.waitForTimeout(500)
  expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false)
  await expect(page.locator('[data-spec="2"][data-intro]')).toBeVisible()
})
