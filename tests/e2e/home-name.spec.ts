import { expect, test, type APIRequestContext } from '@playwright/test'

import { accountFor, password } from './accounts'

// Проекты → «Показывать название на слайде главной» (on by default). Needs the sample data, like home.spec.ts.
// This changes Home for everyone, so playwright.config.ts runs this file on its own after the other tests.
const NAME = '[Пример] Кафе «Кирпич»'

async function setShowName(request: APIRequestContext, homeShowName: boolean) {
  await request.post('/api/v1/users/login', { data: { email: accountFor(test.info().project.name), password } })
  const found = await request.get('/api/v1/projects', { params: { 'where[slug][equals]': 'sample-cafe', depth: 0 } })
  const { docs } = await found.json()
  const saved = await request.patch(`/api/v1/projects/${docs[0].id}`, { data: { homeShowName } })
  expect(saved.ok(), await saved.text()).toBeTruthy()
}

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'idp-intro-session', value: '1', url: baseURL! }])
})

test.afterEach(async ({ request }) => {
  await setShowName(request, true)
})

test('Switched off, the slide loses the name but still opens the project and names it to screen readers', async ({ page, request }) => {
  const left = page.locator('[data-spec="1.2"]')
  await page.goto('/')
  await expect(left).toContainText(NAME)

  await setShowName(request, false)
  await page.goto('/')
  await expect(left).not.toContainText(NAME)
  await expect(left).toContainText('Смотреть проект')
  const link = left.getByRole('link')
  await expect(link).toHaveAttribute('href', '/projects/public/sample-cafe')
  await expect(link).toHaveAttribute('aria-label', new RegExp(NAME))
})
