import { expect, test } from '@playwright/test'

import { accountFor, password } from './accounts'

// «Диагностика»: settings, live checks and the latest log lines, for signed-in staff only, with secrets hidden
test('the diagnostics page shows checks, settings and log lines without secrets', async ({ page, request }, testInfo) => {
  expect((await request.get('/api/v1/diagnostics')).status()).toBe(401)

  await page.goto('/admin/login')
  await page.locator('#field-email').fill(accountFor(testInfo.project.name))
  await page.locator('#field-password').fill(password)
  await page.locator('button[type=submit]').click()
  await expect(page).toHaveURL(/\/admin$/)

  await expect(page.locator('#nav-diagnostics')).toHaveAttribute('href', '/admin/diagnostics')
  await page.goto('/admin/diagnostics')
  await expect(page.getByRole('heading', { name: /Диагностика|Diagnostics|诊断/, level: 1 })).toBeVisible()
  await expect(page.locator('[data-overall]')).toBeVisible()
  await expect(page.locator('tr[data-check=database]')).toHaveAttribute('data-status', 'ok')
  await expect(page.locator('tr[data-check=PAYLOAD_SECRET]')).toBeVisible()

  const body = await (await page.request.get('/api/v1/diagnostics')).json()
  expect(body.logs.length).toBeGreaterThan(0)
  const text = JSON.stringify(body)
  const uri = body.settings.find((c: { id: string }) => c.id.startsWith('DATABASE_'))?.vars?.value ?? ''
  expect(uri).not.toMatch(/:\/\/[^:]+:(?!\*\*\*@)[^@]+@/)
  expect(text).not.toMatch(/PAYLOAD_SECRET[^}]*"value"/)
})
