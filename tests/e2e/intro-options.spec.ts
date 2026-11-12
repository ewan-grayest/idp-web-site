import { expect, test, type APIRequestContext } from '@playwright/test'

import { accountFor, password } from './accounts'

// Студия → Промо-видео: show over Home on the first visit, start by itself, with sound (all on by default), and the
// background until the video starts (its first frame by default).
// These change the site for everyone, so playwright.config.ts runs this file on its own after the other tests.
test.describe.configure({ mode: 'serial' })

type Options = {
  introOnFirstVisit?: boolean
  promoAutoplay?: boolean
  promoSound?: boolean
  promoBackground?: 'frame' | 'image'
  promoBackgroundImage?: number | null
}

async function login(request: APIRequestContext) {
  await request.post('/api/v1/users/login', { data: { email: accountFor(test.info().project.name), password } })
}

async function setOptions(request: APIRequestContext, data: Options) {
  await login(request)
  const saved = await request.post('/api/v1/globals/studio', { data })
  expect(saved.ok(), await saved.text()).toBeTruthy()
}

test.afterEach(async ({ request }) => {
  await setOptions(request, { introOnFirstVisit: true, promoAutoplay: true, promoSound: true, promoBackground: 'frame' })
})

// A 16×9 GIF of two frames, green then grey
const gif = Buffer.from(
  'R0lGODlhEAAJAIAAAExpcY3GPyH/C05FVFNDQVBFMi4wAwEAAAAh+QQFFAAAACwAAAAAEAAJAAACCoyPqcvtD6OclBUAIfkEBRQAAAAsAAAAABAACQCATGlx0tLSAgqMj6nL7Q+jnJQVADs=',
  'base64',
)

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

test('Start on a click: the video waits on its first frame with the play button; a click anywhere on it starts it', async ({ page, request }) => {
  await setOptions(request, { promoAutoplay: false })
  for (const [path, target] of [
    ['/', '[data-spec="2.2"]'],
    ['/promo', '[data-promo-screen]'],
  ]) {
    await page.goto(path)
    const video = page.locator('[data-spec="2"] video')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)
    // Loaded up to its first frame, which shows, and stopped there
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThanOrEqual(2)
    const [paused, at] = await video.evaluate((v: HTMLVideoElement) => [v.paused, v.currentTime])
    expect(paused).toBe(true)
    expect(at).toBeLessThan(0.1)
    await expect(page.locator('[data-spec="2.2"]')).toBeVisible()
    await page.locator(target).click({ position: target === '[data-promo-screen]' ? { x: 100, y: 200 } : undefined })
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.3)
    await expect(page.locator('[data-spec="2"]')).toBeVisible()
  }
})

test('A background image, a GIF too, shows until the video starts, then gives way to it', async ({ page, request }) => {
  await login(request)
  const upload = await request.post('/api/v1/media', {
    multipart: { file: { name: 'e2e-promo-background.gif', mimeType: 'image/gif', buffer: gif }, _payload: JSON.stringify({}) },
  })
  expect(upload.status(), await upload.text()).toBe(201)
  const image = (await upload.json()).doc
  try {
    await setOptions(request, { promoAutoplay: false, promoBackground: 'image', promoBackgroundImage: image.id })
    await page.goto('/')
    const background = page.locator('[data-spec="2"] [data-promo-background]')
    await expect(background.locator('img')).toBeVisible()
    await expect(background.locator('img')).toHaveAttribute('src', /e2e-promo-background(-\d+)?\.gif$/)
    await expect(background).not.toHaveAttribute('data-hidden')
    // No start time in the address: the image, not the first frame, is the background
    expect(await page.locator('[data-spec="2"] video').evaluate((v: HTMLVideoElement) => v.currentSrc)).not.toContain('#t=')
    await page.locator('[data-spec="2.2"]').click()
    await expect.poll(() => page.locator('[data-spec="2"] video').evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.3)
    await expect(background).toHaveAttribute('data-hidden', 'true')

    // Visitors who ask for less motion see the GIF's first frame, drawn still
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/promo')
    const still = page.locator('[data-promo-background] canvas')
    await expect(still).toBeVisible()
    await expect.poll(() => still.evaluate((c: HTMLCanvasElement) => [c.width, c.height])).toEqual([16, 9])
    await expect(page.locator('[data-promo-background] img')).toBeHidden()
    // Over Home the intro does not start by itself for them, so the background stays with the play button
    await setOptions(request, { promoAutoplay: true })
    await page.goto('/?intro')
    await expect(page.locator('[data-spec="2.2"]')).toBeVisible()
    await page.waitForTimeout(1000)
    await expect(page.locator('[data-promo-background]')).not.toHaveAttribute('data-hidden')
    expect(await page.locator('[data-spec="2"] video').evaluate((v: HTMLVideoElement) => v.paused)).toBe(true)
  } finally {
    await setOptions(request, { promoBackground: 'frame', promoBackgroundImage: null })
    await request.delete(`/api/v1/media/${image.id}`)
  }
})

test('«Картинку» needs an image', async ({ request }) => {
  await login(request)
  const saved = await request.post('/api/v1/globals/studio', { data: { promoBackground: 'image', promoBackgroundImage: null } })
  expect(saved.status()).toBe(400)
})

test('Sound off: the video plays muted, with no hint, and the first click closes it without turning the sound on', async ({ page, request }) => {
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
  await page.evaluate(() => {
    const v = document.querySelector<HTMLVideoElement>('[data-spec="2"] video')!
    v.addEventListener('volumechange', () => !v.muted && document.documentElement.setAttribute('data-sound-was-on', ''))
  })
  // The first click on the video already closes it (with sound on, the first click only turns the sound on)
  await page.locator('[data-promo-screen]').click()
  await expect(page.locator('[data-spec="2"]')).toHaveCount(0)
  await expect(page.locator('[data-spec="1.2"]')).toBeVisible()
  await expect(page.locator('html[data-sound-was-on]')).toHaveCount(0)
})
