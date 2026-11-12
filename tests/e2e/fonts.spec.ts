import { expect, test } from '@playwright/test'

// Fonts as in the spec and free (Ewan, 2026-11-11): Roboto, served by the site itself; body text at 10pt.

test('Pages render in the self-hosted Roboto, body at 10pt', async ({ page }) => {
  const fontRequests: string[] = []
  page.on('request', (req) => {
    if (req.resourceType() === 'font') fontRequests.push(req.url())
  })
  await page.goto('/studio')
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)

  const body = await page.evaluate(() => {
    const style = getComputedStyle(document.body)
    return { family: style.fontFamily, size: style.fontSize }
  })
  expect(body.family).toMatch(/^"Roboto Variable", Roboto,/)
  expect(parseFloat(body.size)).toBeCloseTo((10 * 96) / 72, 2)

  // The face is loaded, in Cyrillic and in light, regular and bold weights, so nothing falls back to Arial
  for (const weight of [300, 400, 700]) {
    expect(await page.evaluate((w) => document.fonts.check(`${w} 16px "Roboto Variable"`, 'Студия'), weight)).toBe(true)
  }
  // Every font comes from the site, none from a font service
  expect(fontRequests.length).toBeGreaterThan(0)
  for (const url of fontRequests) expect(new URL(url).origin).toBe(new URL(page.url()).origin)
})
