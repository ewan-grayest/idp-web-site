import { expect, test } from '@playwright/test'

// Home plays the promo video once per browser session (see intro.spec.ts); these tests start as a returning visitor
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'idp-intro-session', value: '1', url: baseURL! }])
})

test('Home has no header, two sliders and the logo to the Team page', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('header[data-spec="0.1"]')).toHaveCount(0)
  await expect(page.locator('[data-spec="2"]')).toHaveCount(0)
  await expect(page.locator('[data-spec="1.2"]')).toBeVisible()
  await expect(page.locator('[data-spec="1.3"]')).toBeVisible()
  await page.locator('[data-spec="1.1"]').click()
  await expect(page).toHaveURL(/\/studio$/)
  await expect(page.locator('header[data-spec="0.1"]')).toBeVisible()
})

test('Home: the open half follows the cursor and the centre brings both back', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Phones stack the halves and never expand them')
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const home = page.locator('[data-spec="1"]')
  const logo = page.locator('[data-spec="1.1"]')
  // The first move can land before the page is interactive, so it is retried
  await expect(async () => {
    await page.mouse.move(250, 450, { steps: 4 })
    await expect(home).toHaveAttribute('data-hover', 'left', { timeout: 500 })
  }).toPass()
  await expect(logo).toHaveCSS('opacity', '0')
  // The open half covers the whole screen; heading for the logo brings the 50/50 view back
  await page.mouse.move(720, 450, { steps: 12 })
  await expect(home).not.toHaveAttribute('data-hover')
  await expect(logo).toHaveCSS('opacity', '1')
  await page.mouse.move(1200, 450, { steps: 12 })
  await expect(home).toHaveAttribute('data-hover', 'right')
  await page.mouse.move(720, 450, { steps: 12 })
  await page.mouse.down()
  await page.mouse.up()
  await expect(page).toHaveURL(/\/studio$/)
})

test('Home: the language list can be reached from an open half', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Phones stack the halves and never expand them')
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const home = page.locator('[data-spec="1"]')
  await expect(async () => {
    await page.mouse.move(1250, 300, { steps: 4 })
    await expect(home).toHaveAttribute('data-hover', 'right', { timeout: 500 })
  }).toPass()
  const box = (await home.locator('[data-language-links] a[hreflang="en"]').boundingBox())!
  const [x, y] = [box.x + box.width / 2, box.y + box.height / 2]
  await page.mouse.move(x, y, { steps: 12 })
  await expect(home).not.toHaveAttribute('data-hover')
  await page.mouse.click(x, y)
  await expect(page).toHaveURL(/\/en$/)
})

test('Home: keyboard opens the focused half, the logo comes back after it', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Phones stack the halves and never expand them')
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const home = page.locator('[data-spec="1"]')
  await expect(async () => {
    await page.locator('body').focus()
    await page.keyboard.press('Tab')
    await expect(home).toHaveAttribute('data-hover', 'left', { timeout: 500 })
  }).toPass()
  // ‹ and › of the open half keep it open, and work from the keyboard
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await expect(page.locator('[data-spec="1.2"]').getByRole('button', { name: 'Следующий проект' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-spec="1.2.1"]')).toContainText('02 / 04')
  await expect(home).toHaveAttribute('data-hover', 'left')
  await page.keyboard.press('Tab')
  await expect(home).toHaveAttribute('data-hover', 'right')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await expect(page.locator('[data-spec="1.1"]')).toBeFocused()
  await expect(home).not.toHaveAttribute('data-hover')
  await expect(page.locator('[data-spec="1.1"]')).toHaveCSS('opacity', '1')
})

test('Header title follows the section; footer is present', async ({ page }) => {
  await page.goto('/payment')
  await expect(page.locator('[data-spec="0.1.2"]')).toHaveText('Способы оплаты')
  await expect(page.locator('footer[data-spec="0.3"]')).toBeVisible()
})

test('Enquiry needs consent, which is unticked by default', async ({ page }) => {
  await page.goto('/studio')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Написать нам' }).click()
  const box = page.locator('[data-spec="0.1.9"]')
  await expect(box).not.toBeChecked()
  await page.locator('[data-spec="0.1.7"]').fill('test@example.ru')
  await page.getByRole('button', { name: 'Отправить' }).click()
  await expect(page.getByRole('status')).toContainText('согласие')
  await box.check()
  await page.getByRole('button', { name: 'Отправить' }).click()
  await expect(page.getByRole('status')).toContainText('Спасибо')
})

test('Consent is remembered once ticked', async ({ page }) => {
  await page.goto('/studio')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Написать нам' }).click()
  await page.locator('[data-spec="0.1.9"]').check()
  await page.reload()
  // Wait for the page to come alive, or the click lands before the button works
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Написать нам' }).click()
  await expect(page.locator('[data-spec="0.1.9"]')).toBeChecked()
})
