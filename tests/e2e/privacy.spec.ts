import { expect, test, type APIRequestContext } from '@playwright/test'

import { accountFor, password } from './accounts'

/** 152-ФЗ: cookie notice, third-party content only with consent, consent log. */

// A first visit: no answer to the cookie notice yet
test.use({ storageState: { cookies: [], origins: [] } })

type ConsentDoc = { purpose: string; decision: string; subject?: string | null; source: string; ip?: string; userAgent?: string; wording: string; documents: { slug: string; sha256?: string; missing?: true }[] }

async function latestConsents(request: APIRequestContext, project: string, where: Record<string, string>): Promise<ConsentDoc[]> {
  await request.post('/api/v1/users/login', { data: { email: accountFor(project), password } })
  const params: Record<string, string> = { sort: '-createdAt', limit: '5', depth: '0' }
  for (const [k, v] of Object.entries(where)) params[`where[${k}][equals]`] = v
  const res = await request.get('/api/v1/consents', { params })
  expect(res.ok()).toBeTruthy()
  return (await res.json()).docs
}

test('The cookie notice asks first; the Yandex map waits for consent', async ({ page, request }, testInfo) => {
  await page.goto('/studio')
  const notice = page.locator('[data-cookie-notice]')
  await expect(notice).toBeVisible()
  // Nothing is loaded from Yandex until the visitor allows it
  await expect(page.locator('iframe[data-spec="3.5.2"]')).toHaveCount(0)
  await expect(page.locator('[data-spec="3.5.2"][data-third-party="blocked"]')).toBeVisible()

  const logged = page.waitForResponse((r) => r.url().includes('/api/v1/consents') && r.request().method() === 'POST')
  await notice.getByRole('button', { name: 'Только необходимые' }).click()
  expect((await logged).ok()).toBeTruthy()
  await expect(notice).toBeHidden()
  await expect(page.locator('iframe[data-spec="3.5.2"]')).toHaveCount(0)

  // The answer is remembered
  await page.reload()
  await expect(notice).toBeHidden()

  // One map on request
  await page.getByRole('button', { name: 'Показать карту' }).click()
  await expect(page.locator('iframe[data-spec="3.5.2"]')).toHaveAttribute('src', /yandex\.ru\/map-widget/)

  const [record] = await latestConsents(request, testInfo.project.name, { purpose: 'cookies' })
  expect(record).toMatchObject({ decision: 'necessary-only', source: 'cookie-banner' })
  expect(record.ip).toBeTruthy()
  expect(record.userAgent).toBeTruthy()
  expect(record.wording).toContain('Только необходимые')
  expect(record.documents.map((d) => d.slug)).toEqual(['privacy'])
})

test('Footer «Настройки cookie» opens the notice again; «Принять все» loads the map', async ({ page }) => {
  await page.goto('/studio')
  await page.locator('[data-cookie-notice]').getByRole('button', { name: 'Только необходимые' }).click()
  await page.locator('footer').getByRole('button', { name: 'Настройки cookie' }).click()
  await page.locator('[data-cookie-notice]').getByRole('button', { name: 'Принять все' }).click()
  await expect(page.locator('iframe[data-spec="3.5.2"]')).toHaveAttribute('src', /yandex\.ru\/map-widget/)
})

test('Footer links the personal data policy and notes Meta’s networks', async ({ page }) => {
  await page.goto('/studio')
  const footer = page.locator('footer')
  await expect(footer.getByRole('link', { name: 'Политика обработки персональных данных' })).toHaveAttribute('href', '/legal#privacy')
  await expect(footer).toContainText('Meta')
})

test('An enquiry writes its consent to the log with time, address and document versions', async ({ page, request }, testInfo) => {
  const email = `consent-${testInfo.project.name}-${Date.now()}@example.ru`
  await page.goto('/studio')
  await page.locator('[data-cookie-notice]').getByRole('button', { name: 'Только необходимые' }).click()
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Написать нам' }).click()
  await page.locator('[data-spec="0.1.7"]').fill(email)
  await page.locator('[data-spec="0.1.9"]').check()
  await page.getByRole('button', { name: 'Отправить' }).click()
  await expect(page.getByRole('status')).toContainText('Спасибо')

  const [record] = await latestConsents(request, testInfo.project.name, { subject: email })
  expect(record).toMatchObject({ purpose: 'personal-data', decision: 'agree', source: 'lead', wording: 'Даю согласие на обработку моих персональных данных' })
  expect(record.ip).toBeTruthy()
  expect(record.documents.map((d) => d.slug)).toEqual(['personal-data', 'privacy'])
})

test('Visitors can neither read the consent log nor forge a record', async ({ request }, testInfo) => {
  expect((await request.get('/api/v1/consents')).status()).toBe(403)
  const forged = await request.post('/api/v1/consents', {
    data: { purpose: 'personal-data', decision: 'agree', subject: 'forged@example.ru', source: 'lead', ip: '1.2.3.4', originUrl: 'https://example.ru/', locale: 'ru' },
  })
  expect(forged.ok()).toBeTruthy()
  const id = (await forged.json()).doc.id
  await request.post('/api/v1/users/login', { data: { email: accountFor(testInfo.project.name), password } })
  const saved = await (await request.get(`/api/v1/consents/${id}`)).json()
  expect(saved).toMatchObject({ purpose: 'cookies', source: 'cookie-banner', subject: null })
  expect(saved.ip).not.toBe('1.2.3.4')
  // Not editable, and not deletable within a year, even by staff
  expect((await request.patch(`/api/v1/consents/${id}`, { data: { subject: 'x' } })).status()).toBe(403)
  expect((await request.delete(`/api/v1/consents/${id}`)).ok()).toBeFalsy()
})

test('A review needs two separate consents, both written to the log', async ({ page, request }, testInfo) => {
  const name = `Reviewer ${testInfo.project.name} ${Date.now()}`
  await page.goto('/projects/residential/sample-loft')
  await page.locator('[data-cookie-notice]').getByRole('button', { name: 'Только необходимые' }).click()
  const form = page.locator('form[data-spec="5.9.3"]')
  await form.getByLabel('Ваше имя').fill(name)
  await form.getByLabel('Оставить отзыв').fill('Прекрасный проект, всё сделано вовремя.')
  const processing = form.getByRole('checkbox', { name: /обработку моих персональных данных/ })
  const publication = form.getByRole('checkbox', { name: /публикацию моего имени/ })
  await expect(processing).not.toBeChecked()
  await expect(publication).not.toBeChecked()
  await expect(form.getByRole('link', { name: 'Политика обработки персональных данных' })).toHaveAttribute('href', '/legal#privacy')
  await processing.check()
  await publication.check()
  const sent = page.waitForResponse((r) => r.url().endsWith('/api/v1/reviews') && r.request().method() === 'POST')
  await form.getByRole('button', { name: 'Отправить' }).click()
  expect((await sent).ok()).toBeTruthy()

  const records = await latestConsents(request, testInfo.project.name, { subject: name })
  expect(records.map((r) => r.purpose).sort()).toEqual(['personal-data', 'publication'])
  expect(records.find((r) => r.purpose === 'publication')?.documents.map((d) => d.slug)).toEqual(['publication-consent', 'privacy'])
})

test('A review without the publication consent is refused', async ({ request }) => {
  const project = (await (await request.get('/api/v1/projects?where[slug][equals]=sample-loft&depth=0')).json()).docs[0]
  const res = await request.post('/api/v1/reviews', {
    data: { name: 'No publication', text: 'A review without consent to publish it.', consent: true, publicationConsent: false, project: project.id, network: 'vk', originUrl: 'http://localhost:3000/' },
  })
  expect(res.status()).toBe(400)
})
