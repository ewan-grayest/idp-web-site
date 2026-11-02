import { expect, test, type APIRequestContext } from '@playwright/test'

import { accountFor, password } from './accounts'

// Студия → Промо-видео 2: show over Home on the first visit, start by itself, with sound (all on by default).
// These change the site for everyone, so playwright.config.ts runs this file on its own after the other tests.
test.describe.configure({ mode: 'serial' })

type Options = { introOnFirstVisit?: boolean; promoAutoplay?: boolean; promoSound?: boolean }

async function setOptions(request: APIRequestContext, data: Options) {
  await request.post('/api/v1/users/login', { data: { email: accountFor(test.info().project.name), password } })
  const saved = await request.post('/api/v1/globals/studio', { data })
  expect(saved.ok(), await saved.text()).toBeTruthy()
}

test.afterEach(async ({ request }) => {
  await setOptions(request, { introOnFirstVisit: true, promoAutoplay: true, promoSound: true })
})

test('Switched off, Home opens straight away; /?intro and /promo still play the video', async ({ page, request }) => {
  await setOptions(request, { introOnFirstVisit: false })
  await page.goto('/')
  await expect(page.locator('[data-spec="1.2"]')).toBeVisible()
  await expect(page.locator('[data-spec="2"]')).toHaveCount(0)
  await page.goto('/?intro')
  const intro = page.locator('[data-spec="2"][data-intro]')
  await expect.poll(() => intro.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.3)
  await page.goto('/promo')
  await expect.poll(() => page.locator('[data-spec="2"] video').evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.3)
})

test('Start on a click: the video waits on its first frame with the play button', async ({ page, request }) => {
  await setOptions(request, { promoAutoplay: false })
  for (const path of ['/', '/promo']) {
    await page.goto(path)
    const video = page.locator('[data-spec="2"] video')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)
    expect(await video.evaluate((v: HTMLVideoElement) => [v.paused, v.currentTime])).toEqual([true, 0])
    await page.locator('[data-spec="2.2"]').click()
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.3)
  }
})

test('Sound off: the video plays muted, with no hint, and a click does not turn the sound on', async ({ page, request }) => {
  // The same stand-in for the browsers' no-sound-before-a-click rule as promo-sound.spec.ts
  await page.addInitScript(() => {
    let active = false
    for (const e of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(e, () => (active = true), true)
    const play = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function () {
      if (!this.muted && !active) return Promise.reject(new DOMException('No sound before a click', 'NotAllowedError'))
      return play.call(this)
    }
  })
  await setOptions(request, { promoSound: false })
  await page.goto('/')
  const video = page.locator('[data-spec="2"][data-intro] video')
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.3)
  expect(await video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true)
  await expect(page.locator('[data-sound-hint]')).toHaveCount(0)
  // A click on the video now pauses it (with sound on, the first click only turns the sound on)
  await page.locator('[data-close-on-double]').click()
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true)
  expect(await video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true)
})
