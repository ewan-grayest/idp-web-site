import { expect, test, type Page } from '@playwright/test'

// Pages 7, 9 and 17. Needs the sample data: npx payload run scripts/seed.ts

const chip = (page: Page, name: string) => page.locator('[data-spec="7.1.2"]', { hasText: name })
const cardLinks = (page: Page) => page.locator('[data-spec="7.2.2"]')

test('Picked tags turn green; «Выбрать» keeps only projects with all of them', async ({ page }) => {
  await page.goto('/projects/residential')
  await page.waitForLoadState('networkidle')
  for (const name of ['Квартира', 'Москва', 'Минимализм']) {
    await chip(page, name).click()
    await expect(chip(page, name)).toHaveAttribute('aria-pressed', 'true')
  }
  await expect(chip(page, 'Квартира')).toHaveCSS('background-color', 'rgb(141, 198, 63)')
  await expect(page.getByText('Выбрано 3 из 5')).toBeVisible()
  await page.locator('[data-spec="7.1.3"]').click()
  await expect(page).toHaveURL(/\/projects\/residential\?tags=flat,moscow,minimal$/)
  await expect(page.getByText('Найдено: 2')).toBeVisible()
  const hrefs = await cardLinks(page).evaluateAll((els) => els.map((a) => a.getAttribute('href')).sort())
  expect(hrefs).toEqual(['/projects/residential/sample-loft', '/projects/residential/sample-patriarshie'])
  // 7.2.3: the name shows on a green veil on hover; touch screens always show it
  const card = cardLinks(page).first()
  if (!test.info().project.use.hasTouch) await card.hover()
  await expect(card.locator('[data-spec="7.2.3"]')).toHaveCSS('opacity', '1')
  await expect(card.locator('[data-spec="7.2.4"]')).toHaveText(/\[Пример\]/)
  // Tags stay picked after the reload, and «Сбросить» brings every project back
  await expect(chip(page, 'Москва')).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Сбросить' }).click()
  await expect(page).toHaveURL(/\/projects\/residential$/)
  await expect(page.getByText(/^Все проекты: \d+$/)).toBeVisible()
})

test('At most five tags; a double click puts a tag back', async ({ page }) => {
  await page.goto('/projects/residential')
  await page.waitForLoadState('networkidle')
  const names = ['Дуб', 'Квартира', 'Кирпич', 'Лофт', 'Минимализм']
  for (const name of names) await chip(page, name).click()
  await expect(page.getByText('Выбрано 5 из 5')).toBeVisible()
  const sixth = chip(page, 'Москва')
  await expect(sixth).toHaveAttribute('aria-disabled', 'true')
  await sixth.click({ force: true })
  await expect(sixth).toHaveAttribute('aria-pressed', 'false')
  await chip(page, 'Лофт').dblclick()
  await expect(chip(page, 'Лофт')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByText('Выбрано 4 из 5')).toBeVisible()
  await expect(sixth).not.toHaveAttribute('aria-disabled', 'true')
  // A double click on a grey tag leaves it grey
  await sixth.dblclick()
  await expect(sixth).toHaveAttribute('aria-pressed', 'false')
})

test('A tag on a project page opens its collection filtered by that tag', async ({ page }) => {
  await page.goto('/projects/residential/sample-loft')
  await page.locator('[data-spec="5.3.1"] a', { hasText: 'Лофт' }).click()
  await expect(page).toHaveURL(/\/projects\/residential\?tags=loft$/)
  await expect(chip(page, 'Лофт')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Найдено: 2')).toBeVisible()
  await cardLinks(page).filter({ hasText: 'Покровке' }).click()
  await expect(page).toHaveURL(/\/projects\/residential\/sample-pokrovka$/)
})

test('No match shows a way back; unknown tags are ignored; unknown kinds are 404', async ({ page }) => {
  await page.goto('/projects/public?tags=oak,moscow')
  await expect(page.getByText('Нет проектов со всеми выбранными тегами.')).toBeVisible()
  await expect(cardLinks(page)).toHaveCount(0)
  await page.getByRole('link', { name: 'Сбросить фильтр' }).click()
  await expect(page).toHaveURL(/\/projects\/public$/)
  await expect(cardLinks(page).first()).toHaveAttribute('href', /^\/projects\/public\//)

  await page.goto('/projects/residential?tags=nope')
  await expect(page.getByText(/^Все проекты: \d+$/)).toBeVisible()
  expect((await page.request.get('/projects/foo')).status()).toBe(404)
})

test('«Узнать ещё больше о проектах» opens the enquiry with the page as context', async ({ page }) => {
  await page.goto('/projects/residential')
  await page.waitForLoadState('networkidle')
  await page.locator('[data-spec="7.3.1"]').click()
  await expect(page.locator('[data-spec="0.1.2"]')).toContainText('Узнать ещё больше о проектах · Жилые интерьеры')
  await expect(page.locator('[data-spec="0.1.7"]')).toBeFocused()
})

test('English page keeps its language when filtering', async ({ page }) => {
  await page.goto('/en/projects/residential')
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: 'Pick up to 5 tags' })).toBeVisible()
  await chip(page, 'Oak').or(chip(page, 'Дуб')).first().click()
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page).toHaveURL(/\/en\/projects\/residential\?tags=oak$/)
  await expect(cardLinks(page).first()).toHaveAttribute('href', /^\/en\/projects\/residential\//)
})

test('The header keeps the page name while the tag prompt scrolls under it', async ({ page }) => {
  await page.goto('/projects/residential')
  await page.waitForLoadState('networkidle')
  for (const y of [300, 900, 1600]) {
    await page.mouse.wheel(0, y)
    await page.waitForTimeout(200)
    await expect(page.locator('[data-spec="0.1.2"]')).toHaveText('Жилые интерьеры')
  }
})
