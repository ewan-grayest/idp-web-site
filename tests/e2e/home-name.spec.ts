import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

import { accountFor, password } from './accounts'

// Names on the Home slides (Ewan, 2026-11-12): each project's «Показывать название на слайде главной», which
// «Настройки сайта и интеграции» → «Главная» can override for every slide at once. Needs the sample data, like
// home.spec.ts. This changes Home for everyone, so playwright.config.ts runs this file on its own after the other tests.
const NAME = '[Пример] Кафе «Кирпич»'
type Mode = 'project' | 'show' | 'hide'

async function signIn(request: APIRequestContext) {
  const login = await request.post('/api/v1/users/login', { data: { email: accountFor(test.info().project.name), password } })
  expect(login.ok(), await login.text()).toBeTruthy()
}

async function setMode(request: APIRequestContext, homeSlideNames: Mode) {
  await signIn(request)
  const saved = await request.post('/api/v1/globals/site-settings', { data: { homeSlideNames } })
  expect(saved.ok(), await saved.text()).toBeTruthy()
}

async function setCafeShowsName(request: APIRequestContext, homeShowName: boolean) {
  await signIn(request)
  const found = await request.get('/api/v1/projects', { params: { 'where[slug][equals]': 'sample-cafe', limit: 1, depth: 0 } })
  const [cafe] = (await found.json()).docs as { id: number }[]
  expect(cafe, 'The sample project sample-cafe is missing: run scripts/seed.ts').toBeTruthy()
  const saved = await request.patch(`/api/v1/projects/${cafe.id}`, { data: { homeShowName } })
  expect(saved.ok(), await saved.text()).toBeTruthy()
}

/** The left slider without the cafe's name, still a link to the project that screen readers name */
async function expectNameHidden(page: Page) {
  const left = page.locator('[data-spec="1.2"]')
  await expect(left).not.toContainText(NAME)
  await expect(left).toContainText('Смотреть проект')
  const link = left.getByRole('link')
  await expect(link).toHaveAttribute('href', '/projects/public/sample-cafe')
  // The name has brackets, so it is escaped before it goes into a pattern
  await expect(link).toHaveAttribute('aria-label', new RegExp(NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
}

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'idp-intro-session', value: '1', url: baseURL! }])
})

test.afterEach(async ({ request }) => {
  await setMode(request, 'project')
  await setCafeShowsName(request, true)
})

test('Left to each project, a slide hides its name only where that project says so', async ({ page, request }) => {
  const left = page.locator('[data-spec="1.2"]')
  await page.goto('/')
  await expect(left).toContainText(NAME)

  await setCafeShowsName(request, false)
  await page.goto('/')
  await expectNameHidden(page)
  // The residential slider's projects keep their names
  await expect(page.locator('[data-spec="1.3"]')).toContainText('[Пример]')
})

test('Site settings show every name, even a project that hides its own', async ({ page, request }) => {
  await setCafeShowsName(request, false)
  await setMode(request, 'show')
  await page.goto('/')
  await expect(page.locator('[data-spec="1.2"]')).toContainText(NAME)
})

test('Site settings hide every name: picked in the admin, no slide shows one', async ({ page, request }) => {
  await page.goto('/admin/login')
  await page.locator('#field-email').fill(accountFor(test.info().project.name))
  await page.locator('#field-password').fill(password)
  await page.locator('button[type=submit]').click()
  await expect(page).toHaveURL(/\/admin$/)

  await page.goto('/admin/globals/site-settings')
  // Payload reopens the tab this user had open last, so pick «Главная» first
  await page.locator('.tabs-field__tab-button', { hasText: /^(Главная|Home|首页)$/ }).click()
  await page.getByText(/^(Скрывать на всех слайдах|Hide on every slide|所有幻灯片都隐藏)$/).click()
  await page.locator('#action-save').click()
  await expect.poll(async () => (await (await request.get('/api/v1/globals/site-settings?depth=0')).json()).homeSlideNames).toBe('hide')

  await page.goto('/')
  await expectNameHidden(page)
  await expect(page.locator('[data-spec="1.3"]')).not.toContainText('[Пример]')
})
