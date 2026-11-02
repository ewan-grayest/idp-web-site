import { expect, test } from '@playwright/test'

// Page 3. Needs the sample data: npx payload run scripts/seed.ts

test('Header title starts at Mission and follows the sections', async ({ page }) => {
  await page.goto('/studio')
  await page.waitForLoadState('networkidle')
  const title = page.locator('[data-spec="0.1.2"]')
  await expect(title).toHaveText('Миссия и видение')
  await page.locator('[data-spec="3.4"]').evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + 100))
  await expect(title).toHaveText('Online журнал')
})

test('Choosing a person opens 3.2-a with the quote and a link to the Person page; close hides it', async ({ page }) => {
  await page.goto('/studio')
  await page.waitForLoadState('networkidle')
  const person = page.locator('[data-spec="3.2.2"]').first()
  await person.click()
  await expect(person).toHaveAttribute('aria-pressed', 'true')
  const card = page.locator('[data-spec="3.2-a"]')
  await expect(card).toBeVisible()
  await expect(card.locator('[data-spec="3.2.7"]')).toBeVisible()
  await expect(card.locator('[data-spec="3.2.6"]')).toHaveAttribute('href', /^\/team\/sample-/)
  await card.getByRole('button', { name: 'Закрыть' }).click()
  await expect(card).toHaveCount(0)
})

test('A person card links to their achievements 4.2 on the Person page', async ({ page }) => {
  await page.goto('/studio')
  await page.waitForLoadState('networkidle')
  const people = page.locator('[data-spec="3.2.2"]')
  const card = page.locator('[data-spec="3.2-a"]')
  // The sample architect has three achievements; find them in the strip
  for (let k = 0; k < (await people.count()); k++) {
    await people.nth(k).click()
    if (await card.locator('[data-team-achievements]').count()) break
  }
  const link = card.locator('[data-team-achievements]')
  await expect(link).toContainText('(3)')
  await link.click()
  await expect(page).toHaveURL(/\/team\/sample-[^#]+#achievements$/)
  await expect(page.locator('[data-spec="4.2"]')).toBeInViewport()
})

test('Project link 5.3.2 narrows the strip to that project team', async ({ page }) => {
  await page.goto('/studio?project=sample-loft#team')
  await expect(page.getByText('Команда проекта «[Пример] Лофт на Солянке»')).toBeVisible()
  await expect(page.locator('[data-spec="3.2.2"]')).toHaveCount(1)
  await page.getByRole('link', { name: 'Вся команда' }).click()
  await expect(page.locator('[data-spec="3.2.2"]')).not.toHaveCount(1)
})

test('Journal cover asks for a copy with the issue as context', async ({ page }) => {
  await page.goto('/studio')
  await page.waitForLoadState('networkidle')
  await page.locator('[data-spec="3.4.2"]').first().click()
  await expect(page.locator('[data-spec="0.1.2"]')).toContainText('Получить экземпляр · Online журнал № 12')
  await expect(page.locator('[data-spec="0.1.7"]')).toBeFocused()
})

test('History, map, company enquiry and partner tiles are there', async ({ page }) => {
  await page.goto('/studio')
  await expect(page.locator('[data-spec="3.3.2"] [role="tab"]').first()).toHaveText(/2026/)
  await expect(page.locator('iframe[data-spec="3.5.2"]')).toHaveAttribute('src', /yandex\.ru\/map-widget/)
  await expect(page.locator('[data-spec="3.5.3"] a[href="mailto:info@id-proekt.com"]')).toBeVisible()
  await expect(page.locator('[data-spec="3.6.1"]')).toHaveText('Узнать больше о компании')
  await expect(page.locator('[data-spec="3.7.2"]').first()).toHaveAttribute('href', /^\/partners#/)
})

test('An issue with a link opens the magazine online; «Получить экземпляр» stays under it', async ({ page }) => {
  await page.goto('/studio')
  await page.waitForLoadState('networkidle')
  const online = page.locator('a[data-spec="3.4.2"]')
  await expect(online).toHaveCount(1)
  await expect(online).toHaveAttribute('href', 'https://example.com/id-project-journal-11')
  await expect(online).toHaveAttribute('target', '_blank')
  await page.getByRole('button', { name: /№ 11, .*получить экземпляр/ }).click()
  await expect(page.locator('[data-spec="0.1.2"]')).toContainText('Получить экземпляр · Online журнал № 11')
})
